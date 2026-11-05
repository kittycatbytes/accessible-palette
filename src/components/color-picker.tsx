"use client";

import { useRef, useState } from "react";
import {
  clamp,
  cmykToHex,
  hsbFromField,
  hsbToHex,
  hueFromStrip,
  labToHex,
  normalizeHex,
  readCmyk,
  readHsb,
  readLab,
  hexToRgb,
  hslToHex,
  readHsl,
  rgbToHex,
} from "@/lib/color";
import type { PickerMode } from "@/lib/types";

export function HslBars({
  hex,
  onChange,
  onGestureStart,
  onGestureEnd,
}: {
  hex: string;
  onChange: (hex: string) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}) {
  const hsl = readHsl(hex);
  return (
    <div className="picker-bars">
      <VerticalBar
        label="Hue"
        caption="H"
        valueText={`${hsl.h} degrees`}
        value={hsl.h}
        max={360}
        highAtTop={false}
        background="linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
        onGestureStart={onGestureStart}
        onGestureEnd={onGestureEnd}
        onChange={(value) => onChange(hslToHex(value, hsl.s, hsl.l))}
      />
      <VerticalBar
        label="Saturation"
        caption="S"
        valueText={`${hsl.s} percent`}
        value={hsl.s}
        max={100}
        highAtTop
        background={`linear-gradient(to bottom, ${hslToHex(hsl.h, 100, hsl.l)}, ${hslToHex(hsl.h, 0, hsl.l)})`}
        onGestureStart={onGestureStart}
        onGestureEnd={onGestureEnd}
        onChange={(value) => onChange(hslToHex(hsl.h, value, hsl.l))}
      />
      <VerticalBar
        label="Lightness"
        caption="L"
        valueText={`${hsl.l} percent`}
        value={hsl.l}
        max={100}
        highAtTop
        background={`linear-gradient(to bottom, ${hslToHex(hsl.h, hsl.s, 100)}, ${hslToHex(hsl.h, hsl.s, 50)}, ${hslToHex(hsl.h, hsl.s, 0)})`}
        onGestureStart={onGestureStart}
        onGestureEnd={onGestureEnd}
        onChange={(value) => onChange(hslToHex(hsl.h, hsl.s, value))}
      />
    </div>
  );
}

export function ColorPicker({
  hex,
  mode,
  onMode,
  onChange,
  onGestureStart,
  onGestureEnd,
}: {
  hex: string;
  mode: PickerMode;
  onMode: (mode: PickerMode) => void;
  onChange: (hex: string) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}) {
  const [draft, setDraft] = useState(hex);
  const [editingHex, setEditingHex] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const hsb = readHsb(hex);
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const lab = readLab(hex);
  const cmyk = readCmyk(hex);

  const hexField = editingHex ? draft : hex;

  function relativePoint(event: React.PointerEvent<HTMLDivElement>, element: HTMLDivElement) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.width === 0 ? 0 : (event.clientX - rect.left) / rect.width,
      y: rect.height === 0 ? 0 : (event.clientY - rect.top) / rect.height,
    };
  }

  function moveField(event: React.PointerEvent<HTMLDivElement>) {
    const element = fieldRef.current;
    if (!element) return;
    const point = relativePoint(event, element);
    onChange(hsbFromField(point.x, point.y, hsb.h));
  }

  function moveHue(event: React.PointerEvent<HTMLDivElement>) {
    const element = hueRef.current;
    if (!element) return;
    const point = relativePoint(event, element);
    onChange(hsbToHex(hueFromStrip(point.y), hsb.s, hsb.b));
  }

  function nudgeField(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 1;
    const next = { s: hsb.s, b: hsb.b };
    if (event.key === "ArrowRight") next.s += step;
    else if (event.key === "ArrowLeft") next.s -= step;
    else if (event.key === "ArrowUp") next.b += step;
    else if (event.key === "ArrowDown") next.b -= step;
    else return;
    event.preventDefault();
    onGestureStart();
    onChange(hsbToHex(hsb.h, next.s, next.b));
  }

  function releaseRange(event: React.PointerEvent<HTMLFieldSetElement>) {
    if ((event.target as HTMLElement).matches("input[type='range']")) onGestureEnd();
  }

  function nudgeHue(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 15 : 1;
    let hue = hsb.h;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") hue -= step;
    else if (event.key === "ArrowDown" || event.key === "ArrowRight") hue += step;
    else if (event.key === "Home") hue = 0;
    else if (event.key === "End") hue = 359;
    else return;
    hue = ((hue % 360) + 360) % 360;
    event.preventDefault();
    onGestureStart();
    onChange(hsbToHex(hue, hsb.s, hsb.b));
  }

  function moveWheel(event: React.PointerEvent<HTMLDivElement>) {
    const element = wheelRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(x, y);
    const radius = rect.width / 2;
    const hue = ((Math.atan2(y, x) * 180) / Math.PI + 450) % 360;
    if (distance > radius * 0.68) {
      onChange(hsbToHex(hue, hsb.s, hsb.b));
      return;
    }
    const half = radius * 0.5;
    const saturation = clamp((x + half) / (half * 2), 0, 1) * 100;
    const brightness = (1 - clamp((y + half) / (half * 2), 0, 1)) * 100;
    onChange(hsbToHex(hsb.h, saturation, brightness));
  }

  return (
    <div className="picker">
      <div className="picker-full">
      <div className="field">
        <label htmlFor="picker-mode">Color picker</label>
        <select
          id="picker-mode"
          value={mode}
          onChange={(event) => onMode(event.target.value as PickerMode)}
        >
          <option value="cube">Hue cube</option>
          <option value="wheel">Color wheel</option>
          <option value="hsb">HSB sliders</option>
          <option value="rgb">RGB sliders</option>
          <option value="lab">Lab sliders</option>
          <option value="cmyk">CMYK sliders</option>
          <option value="hex">Hex</option>
        </select>
      </div>
      <p className="fine-print" id="picker-help">
        This picker sets the selected dot. Every dot uses the same picker.
        {mode === "cube"
          ? " Click a color in the field and the dot becomes that color. The bar on the right sets the hue of the field."
          : mode === "wheel"
            ? " The ring changes hue and keeps the current saturation and brightness."
            : ""}
        {mode === "cmyk"
          ? " CMYK here is a simple conversion, not a press profile."
          : mode === "lab"
            ? " Lab uses CSS Lab (D50)."
            : ""}
      </p>
      {mode === "cube" ? (
        <div className="hue-cube">
          <div
            className="hue-field"
            ref={fieldRef}
            role="group"
            tabIndex={0}
            aria-label={`Color field, ${hex}. Left and right change saturation. Up and down change brightness.`}
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsbToHex(hsb.h, 100, 100)})`,
            }}
            onPointerDown={(event) => {
              onGestureStart();
              event.currentTarget.setPointerCapture(event.pointerId);
              moveField(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) moveField(event);
            }}
            onPointerUp={onGestureEnd}
            onKeyDown={nudgeField}
            onKeyUp={onGestureEnd}
            onBlur={onGestureEnd}
          >
            <span
              className="hue-field-thumb"
              style={{ left: `${hsb.s}%`, top: `${100 - hsb.b}%` }}
            />
          </div>
          <div
            className="hue-strip"
            ref={hueRef}
            role="slider"
            tabIndex={0}
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={Math.round(hsb.h) % 360}
            aria-valuetext={`${Math.round(hsb.h) % 360} degrees`}
            onPointerDown={(event) => {
              onGestureStart();
              event.currentTarget.setPointerCapture(event.pointerId);
              moveHue(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) moveHue(event);
            }}
            onPointerUp={onGestureEnd}
            onKeyDown={nudgeHue}
            onKeyUp={onGestureEnd}
            onBlur={onGestureEnd}
          >
            <span className="hue-strip-rainbow" />
            <span
              className="hue-strip-thumb"
              style={{ top: `${((Math.round(hsb.h) % 360) / 359) * 100}%` }}
            />
          </div>
        </div>
      ) : null}
      {mode === "wheel" ? (
        <div
          className="wheel"
          ref={wheelRef}
          aria-hidden="true"
          onPointerDown={(event) => {
            onGestureStart();
            event.currentTarget.setPointerCapture(event.pointerId);
            moveWheel(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) moveWheel(event);
          }}
          onPointerUp={onGestureEnd}
        >
          <div className="wheel-hue" />
          <div
            className="wheel-sv"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsbToHex(hsb.h, 100, 100)})`,
            }}
          />
        </div>
      ) : null}
      {mode === "cube" || mode === "wheel" || mode === "hsb" ? (
        <fieldset className="channels" onFocus={onGestureStart} onBlur={onGestureEnd} onPointerUp={releaseRange}>
          <legend>{mode === "hsb" ? "HSB" : "Hue, saturation, and brightness"}</legend>
          <Channel
            id="hsb-h"
            label="Hue"
            min={0}
            max={360}
            value={hsb.h}
            onChange={(value) => onChange(hsbToHex(value, hsb.s, hsb.b))}
          />
          <Channel
            id="hsb-s"
            label="Saturation"
            min={0}
            max={100}
            value={hsb.s}
            onChange={(value) => onChange(hsbToHex(hsb.h, value, hsb.b))}
          />
          <Channel
            id="hsb-b"
            label="Brightness"
            min={0}
            max={100}
            value={hsb.b}
            onChange={(value) => onChange(hsbToHex(hsb.h, hsb.s, value))}
          />
        </fieldset>
      ) : null}
      {mode === "rgb" ? (
        <fieldset className="channels" onFocus={onGestureStart} onBlur={onGestureEnd} onPointerUp={releaseRange}>
          <legend>RGB</legend>
          <Channel id="rgb-r" label="Red" min={0} max={255} value={rgb.r} onChange={(value) => onChange(rgbToHex({ ...rgb, r: value }))} />
          <Channel id="rgb-g" label="Green" min={0} max={255} value={rgb.g} onChange={(value) => onChange(rgbToHex({ ...rgb, g: value }))} />
          <Channel id="rgb-b" label="Blue" min={0} max={255} value={rgb.b} onChange={(value) => onChange(rgbToHex({ ...rgb, b: value }))} />
        </fieldset>
      ) : null}
      {mode === "lab" ? (
        <fieldset className="channels" onFocus={onGestureStart} onBlur={onGestureEnd} onPointerUp={releaseRange}>
          <legend>Lab</legend>
          <Channel id="lab-l" label="L" min={0} max={100} value={lab.l} onChange={(value) => onChange(labToHex(value, lab.a, lab.b))} />
          <Channel id="lab-a" label="a" min={-125} max={125} value={lab.a} onChange={(value) => onChange(labToHex(lab.l, value, lab.b))} />
          <Channel id="lab-b" label="b" min={-125} max={125} value={lab.b} onChange={(value) => onChange(labToHex(lab.l, lab.a, value))} />
        </fieldset>
      ) : null}
      {mode === "cmyk" ? (
        <fieldset className="channels" onFocus={onGestureStart} onBlur={onGestureEnd} onPointerUp={releaseRange}>
          <legend>CMYK</legend>
          <Channel id="cmyk-c" label="Cyan" min={0} max={100} value={cmyk.c} onChange={(value) => onChange(cmykToHex(value, cmyk.m, cmyk.y, cmyk.k))} />
          <Channel id="cmyk-m" label="Magenta" min={0} max={100} value={cmyk.m} onChange={(value) => onChange(cmykToHex(cmyk.c, value, cmyk.y, cmyk.k))} />
          <Channel id="cmyk-y" label="Yellow" min={0} max={100} value={cmyk.y} onChange={(value) => onChange(cmykToHex(cmyk.c, cmyk.m, value, cmyk.k))} />
          <Channel id="cmyk-k" label="Black" min={0} max={100} value={cmyk.k} onChange={(value) => onChange(cmykToHex(cmyk.c, cmyk.m, cmyk.y, value))} />
        </fieldset>
      ) : null}
      <div className="field">
        <label htmlFor="hex-value">Hex</label>
        <input
          id="hex-value"
          className="mono"
          value={hexField}
          aria-describedby="picker-help"
          spellCheck={false}
          onFocus={() => {
            setEditingHex(true);
            setDraft(hex);
            onGestureStart();
          }}
          onBlur={() => {
            const next = normalizeHex(draft);
            if (next) onChange(next);
            setEditingHex(false);
            onGestureEnd();
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            const next = normalizeHex(event.target.value);
            if (next) onChange(next);
          }}
        />
      </div>
      </div>
    </div>
  );
}

function VerticalBar({
  label,
  caption,
  valueText,
  value,
  max,
  highAtTop,
  background,
  onChange,
  onGestureStart,
  onGestureEnd,
}: {
  label: string;
  caption: string;
  valueText: string;
  value: number;
  max: number;
  highAtTop: boolean;
  background: string;
  onChange: (value: number) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scale = max === 360 ? 359 : max;
  const fraction = scale === 0 ? 0 : clamp(value, 0, scale) / scale;
  const top = `${(highAtTop ? 1 - fraction : fraction) * 100}%`;

  function fromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const y = rect.height === 0 ? 0 : (event.clientY - rect.top) / rect.height;
    const next = highAtTop
      ? Math.round((1 - clamp(y, 0, 1)) * max)
      : Math.round(clamp(y, 0, 1) * scale);
    onChange(next);
  }

  function nudge(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? (max > 100 ? 15 : 10) : 1;
    let next = value;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") next += highAtTop ? step : -step;
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") next += highAtTop ? -step : step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = scale;
    else return;
    event.preventDefault();
    onGestureStart();
    const wrapped = max === 360 ? ((next % 360) + 360) % 360 : clamp(next, 0, max);
    onChange(wrapped);
  }

  return (
    <div className="hsl-bar">
      <span className="hsl-bar-name">{caption}</span>
      <div
        ref={ref}
        className="hsl-bar-hit"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max === 360 ? 359 : max}
        aria-valuenow={Math.round(value) % (max === 360 ? 360 : max + 1)}
        aria-valuetext={valueText}
        onPointerDown={(event) => {
          onGestureStart();
          event.currentTarget.setPointerCapture(event.pointerId);
          fromEvent(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) fromEvent(event);
        }}
        onPointerUp={onGestureEnd}
        onKeyDown={nudge}
        onKeyUp={onGestureEnd}
        onBlur={onGestureEnd}
      >
        <span className="hsl-bar-track" style={{ background }} />
        <span className="hsl-bar-thumb" style={{ top }} />
      </div>
    </div>
  );
}

function Channel({
  id,
  label,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="channel">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <input
        aria-label={`${label} value`}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
      />
    </div>
  );
}
