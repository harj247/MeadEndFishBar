import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { getVenueConfig, applyBrandColors } from '@/lib/venueConfig'

// Apply cached brand colors immediately on load (before React renders)
applyBrandColors(getVenueConfig());

createRoot(document.getElementById("root")!).render(<App />);
