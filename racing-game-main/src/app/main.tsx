import { createRoot } from 'react-dom/client'
import '@fontsource/orbitron/400.css'
import '@fontsource/orbitron/500.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/orbitron/900.css'
import '@fontsource-variable/inter/wght.css'
import '@/app/styles/global.css'
import '@/shared/assets/preload'
import { App } from '@/app/App'

createRoot(document.getElementById('root')!).render(<App />)
