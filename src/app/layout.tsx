import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"SueloRuta · Decisiones con evidencia",description:"Prototipo experimental para comparar escenarios agrícolas con evidencia trazable."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>;}
