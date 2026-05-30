"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

// Tipos mínimos del IFrame Embed API de Spotify
// https://developer.spotify.com/documentation/embeds/references/iframe-api
type PlaybackData = {
  isPaused?: boolean;
  isBuffering?: boolean;
  duration?: number;
  position?: number;
};

type SpotifyController = {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  loadUri: (uri: string) => void;
  resume: () => void;
  seek: (sec: number) => void;
  addListener: (
    event: "ready" | "playback_update",
    cb: (e: { data: PlaybackData }) => void
  ) => void;
};

type IFrameAPI = {
  createController: (
    el: HTMLElement,
    options: {
      uri: string;
      width?: string | number;
      height?: string | number;
    },
    cb: (controller: SpotifyController) => void
  ) => void;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    SpotifyIframeApi?: IFrameAPI;
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

export type SpotifyPlayerHandle = {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
};

const SCRIPT_SRC = "https://open.spotify.com/embed/iframe-api/v1";

type Props = {
  uri: string | null;
  height?: number;
};

export const SpotifyEmbedPlayer = forwardRef<SpotifyPlayerHandle, Props>(
  function SpotifyEmbedPlayer({ uri, height = 152 }, ref) {
    // El wrapper queda controlado por React (estable). El placeholder donde
    // Spotify monta el iframe se crea vía DOM API fuera del árbol React,
    // así que React no lo reconcilia y no rompe el embed entre renders.
    const wrapperRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<SpotifyController | null>(null);
    // Si pidieron play() antes de que el controller esté listo, queda
    // pendiente y se ejecuta en el primer playback_update con duration > 0.
    const pendingPlayRef = useRef(false);
    // El último uri que el parent pidió. Lo usamos para sincronizar cuando
    // el controller queda listo después de que cambió la prop.
    const latestUriRef = useRef<string | null>(uri);
    latestUriRef.current = uri;

    // Init: crear placeholder + script + controller. Se ejecuta una sola vez.
    useEffect(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      if (!latestUriRef.current) return;

      const placeholder = document.createElement("div");
      placeholder.style.width = "100%";
      wrapper.appendChild(placeholder);

      let cancelled = false;

      function attach(api: IFrameAPI) {
        if (cancelled) return;
        api.createController(
          placeholder,
          {
            uri: latestUriRef.current || "",
            width: "100%",
            height,
          },
          (controller) => {
            if (cancelled) return;
            controllerRef.current = controller;
            // El SDK de Spotify a veces crea el iframe sin allow="autoplay",
            // lo que hace que play() programático sea rechazado. Lo forzamos.
            const iframe = placeholder.querySelector("iframe");
            if (iframe) {
              iframe.setAttribute(
                "allow",
                "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              );
            }
            // Por si el uri cambió mientras esperábamos la callback
            const wantedUri = latestUriRef.current;
            if (wantedUri && wantedUri !== "") {
              controller.loadUri(wantedUri);
            }
            controller.addListener("playback_update", (e) => {
              // Cuando llega el primer update con duration > 0 después de un
              // play pendiente, el track está cargado y podemos arrancar.
              if (
                pendingPlayRef.current &&
                e.data?.duration &&
                e.data.duration > 0
              ) {
                pendingPlayRef.current = false;
                controller.play();
              }
            });
          }
        );
      }

      if (window.SpotifyIframeApi) {
        attach(window.SpotifyIframeApi);
      } else {
        const previous = window.onSpotifyIframeApiReady;
        window.onSpotifyIframeApiReady = (api) => {
          window.SpotifyIframeApi = api;
          previous?.(api);
          attach(api);
        };
        if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
          const s = document.createElement("script");
          s.src = SCRIPT_SRC;
          s.async = true;
          document.body.appendChild(s);
        }
      }

      return () => {
        cancelled = true;
        controllerRef.current = null;
        // Spotify reemplaza el placeholder por un <iframe>. En lugar de
        // remove() en el placeholder (que ya fue reemplazado), vaciamos TODO
        // el contenido del wrapper. Sin esto, el double-mount de React Strict
        // Mode + navegación entre pantallas duplican el iframe.
        if (wrapper) {
          while (wrapper.firstChild) {
            wrapper.removeChild(wrapper.firstChild);
          }
        }
      };
      // Solo deps en mount: cambios de uri se manejan vía loadUri abajo.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cuando cambia la URI, sin recrear el iframe: solo loadUri.
    // Si había un play() pendiente desde antes, reintentamos con un pequeño
    // delay para que el iframe termine de cargar el nuevo track.
    useEffect(() => {
      if (!uri) return;
      if (!controllerRef.current) return;
      controllerRef.current.loadUri(uri);
      if (pendingPlayRef.current) {
        const t = window.setTimeout(() => {
          if (pendingPlayRef.current && controllerRef.current) {
            controllerRef.current.play();
          }
        }, 500);
        return () => window.clearTimeout(t);
      }
    }, [uri]);

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          pendingPlayRef.current = true;
          controllerRef.current?.play();
        },
        pause: () => controllerRef.current?.pause(),
        togglePlay: () => controllerRef.current?.togglePlay(),
      }),
      []
    );

    return <div ref={wrapperRef} style={{ width: "100%" }} />;
  }
);
