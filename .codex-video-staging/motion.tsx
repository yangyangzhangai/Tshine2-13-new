import type {CSSProperties, ReactNode} from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const SOURCE_FPS = 30;
const SOURCE_FILE = "seeday-source-1.mov";

type AppVideoProps = {
  sourceStart: number;
  playbackRate?: number;
  scale?: number;
  shiftY?: number;
  transformOrigin?: string;
  filter?: string;
  opacity?: number;
};

export const AppVideo: React.FC<AppVideoProps> = ({
  sourceStart,
  playbackRate = 1,
  scale = 1.045,
  shiftY = -22,
  transformOrigin = "50% 50%",
  filter,
  opacity = 1,
}) => {
  return (
    <OffthreadVideo
      muted
      src={staticFile(SOURCE_FILE)}
      trimBefore={Math.round(sourceStart * SOURCE_FPS)}
      playbackRate={playbackRate}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `translateY(${shiftY}px) scale(${scale})`,
        transformOrigin,
        filter,
        opacity,
      }}
    />
  );
};

type HeadlineProps = {
  lines: string[];
  duration: number;
  top?: number;
  bottom?: number;
  align?: "left" | "center";
  accentLastLine?: boolean;
  compact?: boolean;
};

export const KineticHeadline: React.FC<HeadlineProps> = ({
  lines,
  duration,
  top,
  bottom,
  align = "left",
  accentLastLine = false,
  compact = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const exit = interpolate(frame, [duration - 12, duration - 3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      className={`headline-panel headline-panel--${align}`}
      style={{top, bottom, opacity: exit}}
    >
      {lines.map((line, index) => {
        const entrance = spring({
          fps,
          frame: frame - index * 5,
          config: {damping: 16, stiffness: 150, mass: 0.72},
        });
        const y = interpolate(entrance, [0, 1], [42, 0]);
        const scale = interpolate(entrance, [0, 1], [0.96, 1]);
        const isAccent = accentLastLine && index === lines.length - 1;

        return (
          <div
            key={line}
            className={[
              "headline-line",
              compact ? "headline-line--compact" : "",
              isAccent ? "headline-line--accent" : "",
            ].join(" ")}
            style={{
              opacity: entrance,
              transform: `translateY(${y}px) scale(${scale})`,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};

export const SceneGrade: React.FC<{
  children?: ReactNode;
  tint?: string;
}> = ({children, tint = "rgba(237, 246, 232, 0.06)"}) => {
  return (
    <AbsoluteFill>
      {children}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.12), transparent 26%, transparent 76%, ${tint})`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 120px rgba(32, 55, 45, 0.08)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

export const ProductionNote: React.FC<{
  label: string;
  detail: string;
}> = ({label, detail}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({
    fps,
    frame,
    config: {damping: 18, stiffness: 180, mass: 0.7},
  });

  return (
    <div
      className="production-note"
      style={{
        opacity: entrance,
        transform: `translateY(${interpolate(entrance, [0, 1], [-28, 0])}px)`,
      }}
    >
      <span>{label}</span>
      <strong>{detail}</strong>
    </div>
  );
};

export const OrganicLine: React.FC<{
  top: number;
  color?: string;
  flip?: boolean;
}> = ({top, color = "#8ac768", flip = false}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [12, 52], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const length = 720;

  return (
    <svg
      viewBox="0 0 888 190"
      style={{
        position: "absolute",
        top,
        left: 0,
        width: "100%",
        transform: flip ? "scaleX(-1)" : undefined,
        overflow: "visible",
      }}
    >
      <path
        d="M72 80 C190 22 285 156 412 82 C520 18 615 132 816 54"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - progress)}
        opacity="0.78"
      />
      <circle
        cx="816"
        cy="54"
        r={8 + progress * 5}
        fill={color}
        opacity={progress}
      />
    </svg>
  );
};

export const MissingMoodSlot: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 3.4), [-1, 1], [0.55, 1]);

  return (
    <AbsoluteFill className="missing-slot-wrap">
      <div
        className="missing-slot"
        style={{boxShadow: `0 0 ${24 + pulse * 18}px rgba(245, 154, 89, 0.28)`}}
      >
        <span>补录位 · 0.9 秒</span>
        <strong>点击选择心情 Happy</strong>
      </div>
    </AbsoluteFill>
  );
};

export const TimelineLight: React.FC = () => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 104], [440, 1450], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <div className="timeline-glow-line" />
      <div className="timeline-glow-dot" style={{transform: `translateY(${y}px)`}} />
    </>
  );
};

export const CutWashes: React.FC<{cuts: number[]}> = ({cuts}) => {
  const frame = useCurrentFrame();
  const nearest = Math.min(...cuts.map((cut) => Math.abs(frame - cut)));
  const opacity = interpolate(nearest, [0, 7], [0.46, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (opacity <= 0) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        opacity,
        background:
          "radial-gradient(circle at 58% 46%, rgba(221,246,199,0.95), rgba(255,255,255,0.78) 44%, rgba(255,255,255,0) 78%)",
        pointerEvents: "none",
      }}
    />
  );
};

export const FadeClip: React.FC<{
  duration: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}> = ({duration, fadeIn = true, fadeOut = true, children, style}) => {
  const frame = useCurrentFrame();
  const input = [
    fadeIn ? 0 : -1,
    fadeIn ? 7 : 0,
    fadeOut ? duration - 8 : duration,
    duration,
  ];
  const output = [fadeIn ? 0 : 1, 1, 1, fadeOut ? 0 : 1];
  const opacity = interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{...style, opacity}}>
      {children}
    </AbsoluteFill>
  );
};
