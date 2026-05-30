"use client";

import {
  Button as HButton,
  Card as HCard,
  Chip as HChip,
  Input as HInput,
  Label as HLabel,
  ProgressBar as HProgressBar,
  Switch as HSwitch,
  Modal,
} from "@heroui/react";
import type {
  AnchorHTMLAttributes,
  CSSProperties,
  ComponentProps,
  ReactNode,
} from "react";
import { tcVar } from "../lib/game";
import { sfx } from "../lib/sound";
import type { Cell, Difficulty, Size, TeamColor } from "../lib/types";

/* ---------- StatusBar ---------- */
export function StatusBar({ title }: { title?: string }) {
  return (
    <div className="statusbar">
      <span className="mono">{title || "9:41"}</span>
      <div className="dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

/* ---------- Switch (HeroUI) — visually matches the original neon design ---------- */
export function Switch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  const handle = (next: boolean) => {
    sfx.toggle(next);
    onChange(next);
  };
  return (
    <HSwitch isSelected={on} onChange={handle} aria-label="Toggle">
      <HSwitch.Control
        className={
          "h-7 w-[46px] rounded-full transition-colors duration-200 " +
          (on ? "[background:var(--accent)]" : "[background:var(--line)]")
        }
      >
        <HSwitch.Thumb
          className={
            "size-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 " +
            (on ? "translate-x-[18px]" : "")
          }
        />
      </HSwitch.Control>
    </HSwitch>
  );
}

/* ---------- Segmented (custom — kept for compactness) ---------- */
export type SegOption<T> = { value: T; label: string };

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={value === o.value ? "on" : ""}
          onClick={() => {
            sfx.tap();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- TeamDot ---------- */
export function TeamDot({ color }: { color: TeamColor }) {
  return (
    <span
      className="dot"
      style={{ ["--tc" as string]: tcVar(color) } as CSSProperties}
    />
  );
}

/* ---------- Difficulty badge built on HeroUI Chip ---------- */
const DIF_COLOR_VAR: Record<Difficulty, string> = {
  1: "var(--lime)",
  2: "var(--amber)",
  3: "var(--rose)",
};

export function DifBadge({ dif }: { dif: Difficulty | 0 }) {
  if (!dif) return null;
  const col = DIF_COLOR_VAR[dif];
  return (
    <HChip
      className="chip mono"
      style={{
        borderColor: "transparent",
        color: col,
        background: `color-mix(in oklch, ${col} 16%, transparent)`,
      }}
    >
      <HChip.Label>{dif} pt</HChip.Label>
    </HChip>
  );
}

/* ---------- BoardGrid (custom — required for layout) ---------- */
export function BoardGrid({
  cells,
  size,
  marked,
  winIdx,
  onCellTap,
  color,
  compact,
}: {
  cells: Cell[];
  size: Size;
  marked?: Set<number>;
  winIdx?: number[];
  onCellTap?: (i: number) => void;
  color: TeamColor;
  compact?: boolean;
}) {
  const winSet = new Set(winIdx || []);
  return (
    <div
      className="board"
      style={
        {
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          ["--tc" as string]: tcVar(color),
        } as CSSProperties
      }
    >
      {cells.map((cell, i) => {
        const isMarked = cell.free || (marked && marked.has(i));
        const isWin = winSet.has(i);
        return (
          <div
            key={i}
            className={
              "cell" + (isMarked ? " marked" : "") + (cell.free ? " free" : "")
            }
            onClick={() => {
              if (!onCellTap || cell.free) return;
              sfx.bloop();
              onCellTap(i);
            }}
            style={{
              fontSize: compact ? "8.5px" : undefined,
              boxShadow: isWin
                ? "0 0 0 2px white, 0 0 14px var(--tc)"
                : undefined,
            }}
          >
            {cell.free ? (
              <span style={{ fontSize: "15px" }}>🎤</span>
            ) : (
              cell.label
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- BottomSheet — HeroUI Modal centrado ----------
 * `fullscreen` usa size="full" de HeroUI (para vistas tipo tablero).
 * El scroll lo da Modal.Body (scroll-inside es el default del Container).
 */
export function BottomSheet({
  open,
  onOpenChange,
  children,
  fullscreen,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: ReactNode;
  fullscreen?: boolean;
}) {
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} variant="opaque">
      <Modal.Container placement="center" size={fullscreen ? "full" : "md"}>
        <Modal.Dialog className={fullscreen ? "kb-sheet-full" : "kb-sheet"}>
          <Modal.CloseTrigger />
          <Modal.Body className="kb-sheet__body">{children}</Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/* ---------- ScreenHeader ---------- */
export function ScreenHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="row between"
      style={{ alignItems: "flex-end", marginBottom: 18, marginTop: 8 }}
    >
      <div className="stack" style={{ gap: 6 }}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="title">{title}</h1>
      </div>
      {action}
    </div>
  );
}

/* ---------- Equalizer (decorative) ---------- */
export function Equalizer() {
  return (
    <div
      className="row"
      style={{
        gap: 3,
        alignItems: "flex-end",
        height: 34,
        width: 34,
        flex: "0 0 34px",
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            flex: 1,
            background: "var(--accent)",
            borderRadius: 2,
            animation: `eq 0.9s ease-in-out ${i * 0.15}s infinite alternate`,
            height: "40%",
          }}
        />
      ))}
    </div>
  );
}

/* ---------- KBButton — HeroUI Button styled with the project's btn classes ---------- */
type KBButtonVariant = "primary" | "ghost" | "neutral";

type ButtonProps = Omit<ComponentProps<typeof HButton>, "variant"> & {
  variant?: KBButtonVariant;
  block?: boolean;
  sm?: boolean;
  iconOnly?: boolean;
};

export function KBButton({
  variant = "neutral",
  block,
  sm,
  iconOnly,
  className,
  children,
  isDisabled,
  onPress,
  ...rest
}: ButtonProps) {
  const cls = [
    "btn",
    variant === "primary" ? "btn-primary" : "",
    variant === "ghost" ? "btn-ghost" : "",
    block ? "block" : "",
    sm ? "btn-sm" : "",
    iconOnly ? "btn-icon" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <HButton
      isDisabled={isDisabled}
      className={cls}
      // HeroUI's own visual variant — but the .btn class wins specificity-wise
      variant="tertiary"
      onPress={(e) => {
        if (variant === "primary") sfx.pop();
        else sfx.click();
        onPress?.(e);
      }}
      {...rest}
    >
      {children}
    </HButton>
  );
}

/* ---------- KBLink — anchor styled like a button (Drawer triggers, Spotify external) ---------- */
export function KBLinkButton({
  className,
  children,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { className?: string }) {
  return (
    <a
      className={"btn " + (className || "")}
      onClick={(e) => {
        sfx.click();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/* ---------- KBCard — HeroUI Card with project class ----------
 * Si trae onClick (es interactiva), juega un tap. */
export function KBCard({
  className,
  glass,
  style,
  children,
  onClick,
  ...rest
}: ComponentProps<typeof HCard> & { glass?: boolean }) {
  return (
    <HCard
      className={"card " + (glass ? "glass " : "") + (className || "")}
      style={style}
      onClick={
        onClick
          ? (e) => {
              sfx.tap();
              onClick(e);
            }
          : onClick
      }
      {...rest}
    >
      {children}
    </HCard>
  );
}

/* ---------- KBChip — HeroUI Chip with project class ---------- */
export function KBChip({
  className,
  style,
  on,
  children,
  onClick,
  ...rest
}: Omit<ComponentProps<typeof HChip>, "color"> & {
  on?: boolean;
  onClick?: () => void;
}) {
  return (
    <HChip
      className={"chip " + (on ? "on " : "") + (className || "")}
      style={style}
      onClick={onClick}
      {...rest}
    >
      {typeof children === "string" ? (
        <HChip.Label>{children}</HChip.Label>
      ) : (
        children
      )}
    </HChip>
  );
}

/* ---------- KBInput — HeroUI Input with project class ---------- */
export function KBInput({
  className,
  style,
  ...rest
}: ComponentProps<typeof HInput>) {
  return (
    <HInput className={"input " + (className || "")} style={style} {...rest} />
  );
}

/* ---------- KBProgress — HeroUI ProgressBar customized ---------- */
export function KBProgress({
  value,
  color,
  ariaLabel = "Progreso",
}: {
  value: number;
  color: string;
  ariaLabel?: string;
}) {
  return (
    <HProgressBar
      aria-label={ariaLabel}
      value={Math.max(0, Math.min(100, value))}
      className="w-full"
    >
      <HLabel className="sr-only">{ariaLabel}</HLabel>
      <HProgressBar.Track
        style={{
          height: 7,
          borderRadius: 4,
          background: "var(--bg-2)",
          overflow: "hidden",
        }}
      >
        <HProgressBar.Fill
          style={{
            background: color,
            borderRadius: 4,
            transition: "width .4s ease",
          }}
        />
      </HProgressBar.Track>
    </HProgressBar>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({
  title,
  msg,
  cta,
  onCta,
}: {
  title: string;
  msg: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div
      className="screen-pad"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        textAlign: "center",
        paddingTop: 120,
      }}
    >
      <div style={{ fontSize: 46, marginBottom: 16, opacity: 0.5 }}>🎤</div>
      <h2 className="title" style={{ marginBottom: 8 }}>
        {title}
      </h2>
      <p
        className="subtitle"
        style={{ fontSize: 14, maxWidth: 260, marginBottom: 22 }}
      >
        {msg}
      </p>
      <KBButton variant="primary" onPress={onCta}>
        {cta}
      </KBButton>
    </div>
  );
}
