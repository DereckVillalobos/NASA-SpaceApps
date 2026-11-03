"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export default function FarmMap({latitude,longitude}:{latitude:number;longitude:number}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!ref.current)return;
    const map=L.map(ref.current,{scrollWheelZoom:false}).setView([latitude,longitude],12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map);
    L.circleMarker([latitude,longitude],{radius:8,color:"#fff",weight:3,fillColor:"#285b45",fillOpacity:1}).addTo(map).bindTooltip("Ubicación declarada de la finca");
    return ()=>{map.remove();};
  },[latitude,longitude]);
  return <><div ref={ref} className="map" role="img" aria-label={`Mapa de ubicación declarada: ${latitude}, ${longitude}`}/><p className="caption">WGS84 · {latitude}, {longitude}. Punto declarado; no delimita las parcelas. Mapa base externo, disponible con conexión.</p></>;
}
