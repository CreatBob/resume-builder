// author: Bob
export const DEFAULT_RESUME_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#dbeafe" />
      <stop offset="100%" stop-color="#bfdbfe" />
    </linearGradient>
  </defs>
  <rect width="240" height="300" fill="url(#bg)" />
  <circle cx="120" cy="96" r="52" fill="#ffffff" fill-opacity="0.82" />
  <path d="M52 260c14-54 56-84 108-84s94 30 108 84" fill="#ffffff" fill-opacity="0.82" />
  <text x="120" y="284" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#1d4ed8">CV</text>
</svg>
`)}` as const
