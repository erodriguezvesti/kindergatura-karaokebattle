// data.js — banco de categorías y estado por defecto de Karaoke Battle
// Cargado como script global (window.KB)
(function () {
  // dificultad: 1 = fácil, 2 = media, 3 = difícil
  const CATEGORIES = [
    // --- Fáciles (1 pto) ---
    { id: "c01", label: "Canción para bailar", dif: 1 },
    { id: "c02", label: "Tema que todos gritan", dif: 1 },
    { id: "c03", label: "Reggaetón antiguo", dif: 1 },
    { id: "c04", label: "Canción de despecho", dif: 1 },
    { id: "c05", label: "Tema noventero", dif: 1 },
    { id: "c06", label: "Himno de fiesta", dif: 1 },
    { id: "c07", label: "Canción de verano", dif: 1 },
    { id: "c08", label: "Tema con nombre de mujer", dif: 1 },
    { id: "c09", label: "Canción romántica", dif: 1 },
    { id: "c10", label: "Cumbia infaltable", df: 1, dif: 1 },
    { id: "c11", label: "Pop en inglés", dif: 1 },
    { id: "c12", label: "Tema de los 2000", dif: 1 },
    { id: "c13", label: "Balada clásica", dif: 1 },
    { id: "c14", label: "Canción de cumpleaños / brindis", dif: 1 },
    { id: "c15", label: "Tema que sabe tu mamá", dif: 1 },
    { id: "c16", label: "Reggaetón actual", dif: 1 },

    // --- Medias (2 ptos) ---
    { id: "c17", label: "One hit wonder", dif: 2 },
    { id: "c18", label: "Dúo famoso", dif: 2 },
    { id: "c19", label: "Rock latino", dif: 2 },
    { id: "c20", label: "Canción de película", dif: 2 },
    { id: "c21", label: "Artista chileno", dif: 2 },
    { id: "c22", label: "Canción que empieza lento", dif: 2 },
    { id: "c23", label: "Tema de banda sonora", dif: 2 },
    { id: "c24", label: "Canción en otro idioma (ni español ni inglés)", dif: 2 },
    { id: "c25", label: "Tema con coro en inglés", dif: 2 },
    { id: "c26", label: "Canción de despecho nivel experto", dif: 2 },
    { id: "c27", label: "Artista que ya no existe / se separó", dif: 2 },
    { id: "c28", label: "Tema de telenovela", dif: 2 },
    { id: "c29", label: "Rock en español", dif: 2 },
    { id: "c30", label: "Canción con silbido o tarareo", dif: 2 },
    { id: "c31", label: "Tema con featuring", dif: 2 },
    { id: "c32", label: "Canción que cambia de ritmo", dif: 2 },
    { id: "c33", label: "Himno generacional", dif: 2 },
    { id: "c34", label: "Tema viral de internet", dif: 2 },
    { id: "c35", label: "Canción vergonzosa que igual te sabes", dif: 2 },
    { id: "c36", label: "Tema de los 80", dif: 2 },

    // --- Difíciles (3 ptos) ---
    { id: "c37", label: "Canción de un álbum, no del single", dif: 3 },
    { id: "c38", label: "Tema cantado a capela", dif: 3 },
    { id: "c39", label: "Canción con más de 3 artistas", dif: 3 },
    { id: "c40", label: "Tema instrumental reconocible", dif: 3 },
    { id: "c41", label: "Canción anterior a 1980", dif: 3 },
    { id: "c42", label: "Tema de jazz, soul o funk", dif: 3 },
    { id: "c43", label: "Canción con segunda voz / armonía", dif: 3 },
    { id: "c44", label: "Tema que nadie admite que le gusta", dif: 3 },
    { id: "c45", label: "Canción de un musical", dif: 3 },
    { id: "c46", label: "Tema de un país específico", dif: 3 },
    { id: "c47", label: "Canción con cambio de idioma a mitad", dif: 3 },
    { id: "c48", label: "One hit wonder de los 90", dif: 3 },
  ].map((c) => ({ id: c.id, label: c.label, dif: c.dif }));

  // Desafíos que el host puede pedir para validar el canto
  const CHALLENGES = [
    { id: "ch1", label: "Continuar la letra", icon: "→" },
    { id: "ch2", label: "Cantar el coro", icon: "♪" },
    { id: "ch3", label: "Cantar sin música", icon: "🔇" },
    { id: "ch4", label: "Decir la siguiente frase", icon: "…" },
    { id: "ch5", label: "Identificar al artista", icon: "?" },
    { id: "ch6", label: "Terminar una línea pausada", icon: "⏸" },
  ];

  // Equipos de ejemplo para arrancar rápido
  const SAMPLE_TEAMS = [
    { name: "Los Desafinados", color: "magenta", playlistRaw: "https://open.spotify.com/playlist/37i9dQZF1DX10zKzsJ2jva" },
    { name: "Coro Caótico", color: "cyan", playlistRaw: "https://open.spotify.com/playlist/37i9dQZF1DWY7IeIP1cdjF" },
  ];

  // Reglas opcionales
  const RULES = [
    {
      id: "hotmic",
      title: "Micrófono caliente",
      desc: "El equipo debe cantar de inmediato. Más de 3 segundos de duda = fallan.",
    },
    {
      id: "steal",
      title: "Robo de casilla",
      desc: "Si un equipo falla, otro puede robar usando OTRA categoría de su tablero.",
    },
    {
      id: "oneper",
      title: "Una categoría por canción",
      desc: "Una canción solo puede usarse una vez por equipo.",
    },
    {
      id: "ban",
      title: "Categoría prohibida",
      desc: "El host puede prohibir categorías demasiado obvias.",
    },
    {
      id: "wild",
      title: "Casilla salvaje",
      desc: "Permite inventar una categoría y defenderla frente al grupo.",
    },
  ];

  const TEAM_COLORS = ["magenta", "cyan", "lime", "amber", "violet", "rose"];

  // Biblioteca demo (representa el pool combinado de las playlists).
  // En producción se reemplaza por los tracks reales que devuelve la API de Spotify.
  const DEMO_TRACKS = [
    { t: "Despacito", a: "Luis Fonsi, Daddy Yankee" },
    { t: "Vivir Mi Vida", a: "Marc Anthony" },
    { t: "La Camisa Negra", a: "Juanes" },
    { t: "Color Esperanza", a: "Diego Torres" },
    { t: "Limón y Sal", a: "Julieta Venegas" },
    { t: "Rayando el Sol", a: "Maná" },
    { t: "Bailando", a: "Enrique Iglesias" },
    { t: "Gasolina", a: "Daddy Yankee" },
    { t: "Propuesta Indecente", a: "Romeo Santos" },
    { t: "La Tortura", a: "Shakira, Alejandro Sanz" },
    { t: "Tusa", a: "Karol G, Nicki Minaj" },
    { t: "El Perdón", a: "Nicky Jam, Enrique Iglesias" },
    { t: "Danza Kuduro", a: "Don Omar, Lucenzo" },
    { t: "Me Gustas Tú", a: "Manu Chao" },
    { t: "A Dios le Pido", a: "Juanes" },
    { t: "Eres", a: "Café Tacvba" },
    { t: "Lamento Boliviano", a: "Enanitos Verdes" },
    { t: "De Música Ligera", a: "Soda Stereo" },
    { t: "Persiana Americana", a: "Soda Stereo" },
    { t: "Matador", a: "Los Fabulosos Cadillacs" },
    { t: "Oye Mi Amor", a: "Maná" },
    { t: "Livin' la Vida Loca", a: "Ricky Martin" },
    { t: "Waka Waka", a: "Shakira" },
    { t: "Hawái", a: "Maluma" },
    { t: "Hasta el Amanecer", a: "Nicky Jam" },
    { t: "Con Altura", a: "Rosalía, J Balvin" },
    { t: "Andas en Mi Cabeza", a: "Chino & Nacho, Daddy Yankee" },
    { t: "La Bicicleta", a: "Carlos Vives, Shakira" },
    { t: "Felices los 4", a: "Maluma" },
    { t: "Robarte un Beso", a: "Carlos Vives, Sebastián Yatra" },
  ];

  window.KB = { CATEGORIES, CHALLENGES, SAMPLE_TEAMS, RULES, TEAM_COLORS, DEMO_TRACKS };
})();
