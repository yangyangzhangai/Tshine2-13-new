import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import {
  AppVideo,
  CutWashes,
  FadeClip,
  KineticHeadline,
  MissingMoodSlot,
  OrganicLine,
  ProductionNote,
  SceneGrade,
  TimelineLight,
} from "./motion";

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const blur = interpolate(frame, [0, 74], [3.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneGrade tint="rgba(234, 244, 229, 0.34)">
      <AppVideo
        sourceStart={1.6}
        playbackRate={0.08}
        scale={1.07}
        shiftY={-32}
        filter={`blur(${blur}px) brightness(0.96)`}
      />
      <AbsoluteFill className="hook-haze" />
      <KineticHeadline
        lines={["Does tracking time", "feel like work?"]}
        duration={75}
        top={300}
        align="center"
        accentLastLine
      />
      <OrganicLine top={590} />
    </SceneGrade>
  );
};

const PlantTeaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, 74], [65, -45], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneGrade>
      <AppVideo
        sourceStart={36.2}
        playbackRate={0.65}
        scale={1.1}
        shiftY={shift}
        transformOrigin="50% 58%"
      />
      <KineticHeadline
        lines={["What if your time", "could grow?"]}
        duration={75}
        top={128}
        accentLastLine
      />
      <OrganicLine top={350} flip />
    </SceneGrade>
  );
};

const TypingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 50, 72, 89], [1.16, 1.16, 1.055, 1.045], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneGrade>
      <AppVideo
        sourceStart={1.8}
        scale={scale}
        transformOrigin="50% 82%"
      />
      <KineticHeadline
        lines={["Just type", "what you’re doing."]}
        duration={90}
        top={112}
        compact
        accentLastLine
      />
    </SceneGrade>
  );
};

const AutoSaveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, 89], [-10, -48], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneGrade>
      <AppVideo sourceStart={7.4} playbackRate={0.87} scale={1.07} shiftY={shift} />
      <KineticHeadline
        lines={["Your last moment saves", "as the next begins."]}
        duration={90}
        top={112}
        compact
        accentLastLine
      />
    </SceneGrade>
  );
};

const MoodMemoryScene: React.FC = () => {
  return (
    <SceneGrade>
      <Sequence from={0} durationInFrames={42} premountFor={24}>
        <AppVideo
          sourceStart={15.8}
          playbackRate={1.86}
          scale={1.065}
          shiftY={-25}
        />
      </Sequence>
      <Sequence from={42} durationInFrames={27} premountFor={20}>
        <AppVideo
          sourceStart={17.4}
          playbackRate={0.02}
          scale={1.065}
          shiftY={-25}
          filter="brightness(0.88)"
        />
        <MissingMoodSlot />
      </Sequence>
      <Sequence from={69} durationInFrames={12} premountFor={12}>
        <AppVideo sourceStart={20.6} scale={1.055} shiftY={-22} />
      </Sequence>
      <Sequence from={81} durationInFrames={24} premountFor={18}>
        <AppVideo
          sourceStart={24}
          playbackRate={1.5}
          scale={1.065}
          shiftY={-25}
        />
      </Sequence>
      <KineticHeadline
        lines={["Add moods", "and memories."]}
        duration={105}
        top={112}
        compact
        accentLastLine
      />
    </SceneGrade>
  );
};

const CompanionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(Math.sin(frame / 7), [-1, 1], [0.22, 0.5]);

  return (
    <SceneGrade tint="rgba(223, 210, 255, 0.18)">
      <AppVideo sourceStart={10} scale={1.06} shiftY={-26} />
      <div
        className="buddy-glow"
        style={{opacity: glow, transform: `scale(${1 + glow * 0.08})`}}
      />
      <KineticHeadline
        lines={["Gentle replies", "from your companion."]}
        duration={90}
        bottom={260}
        compact
        accentLastLine
      />
    </SceneGrade>
  );
};

const TimelineScene: React.FC = () => {
  return (
    <SceneGrade>
      <Sequence from={0} durationInFrames={40} premountFor={20}>
        <FadeClip duration={40} fadeIn={false}>
          <AppVideo
            sourceStart={7.4}
            playbackRate={0.18}
            scale={1.09}
            shiftY={20}
          />
        </FadeClip>
      </Sequence>
      <Sequence from={32} durationInFrames={44} premountFor={20}>
        <FadeClip duration={44}>
          <AppVideo
            sourceStart={17.4}
            playbackRate={0.12}
            scale={1.09}
            shiftY={-12}
          />
        </FadeClip>
      </Sequence>
      <Sequence from={68} durationInFrames={37} premountFor={20}>
        <FadeClip duration={37} fadeOut={false}>
          <AppVideo
            sourceStart={25}
            playbackRate={0.1}
            scale={1.09}
            shiftY={-46}
          />
        </FadeClip>
      </Sequence>
      <TimelineLight />
      <KineticHeadline
        lines={["Your day becomes", "a living timeline."]}
        duration={105}
        top={112}
        compact
        accentLastLine
      />
      <ProductionNote
        label="TEMP · 3.5s"
        detail="待替换：晚上完整时间线滑动"
      />
    </SceneGrade>
  );
};

const RootsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, 104], [56, -42], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneGrade tint="rgba(246, 220, 173, 0.1)">
      <AppVideo
        sourceStart={36.2}
        playbackRate={0.8}
        scale={1.12}
        shiftY={shift}
        transformOrigin="50% 56%"
      />
      <KineticHeadline
        lines={["Every activity grows", "a unique root."]}
        duration={105}
        top={112}
        compact
        accentLastLine
      />
      <ProductionNote label="TEMP · 3.5s" detail="待替换：清晰根系展示" />
    </SceneGrade>
  );
};

const PlantBloomScene: React.FC = () => {
  return (
    <SceneGrade tint="rgba(133, 177, 143, 0.14)">
      <Sequence from={0} durationInFrames={31} premountFor={18}>
        <FadeClip duration={31} fadeIn={false}>
          <AppVideo
            sourceStart={42}
            scale={1.1}
            shiftY={10}
            transformOrigin="50% 55%"
          />
        </FadeClip>
      </Sequence>
      <Sequence from={25} durationInFrames={65} premountFor={20}>
        <FadeClip duration={65} fadeOut={false}>
          <AppVideo
            sourceStart={43}
            playbackRate={0.02}
            scale={1.095}
            shiftY={-10}
            transformOrigin="50% 54%"
          />
        </FadeClip>
      </Sequence>
      <AbsoluteFill className="plant-glow" />
      <KineticHeadline
        lines={["At night, your day", "blooms into a plant."]}
        duration={90}
        bottom={250}
        compact
        accentLastLine
      />
      <ProductionNote
        label="TEMP · 3.0s"
        detail="待替换：夜间生成植物完整动画"
      />
    </SceneGrade>
  );
};

const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const lift = interpolate(frame, [0, 74], [28, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 18, 68, 74], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneGrade tint="rgba(28, 63, 47, 0.26)">
      <AppVideo
        sourceStart={43}
        playbackRate={0.02}
        scale={1.1}
        shiftY={-14}
        filter="blur(4px) brightness(0.72) saturate(0.86)"
      />
      <AbsoluteFill className="end-shade" />
      <div
        className="end-lockup"
        style={{opacity, transform: `translateY(${lift}px)`}}
      >
        <div className="wordmark">Seeday.</div>
        <div className="tagline">See your time grow.</div>
        <div className="end-seed" />
      </div>
    </SceneGrade>
  );
};

export const SeedayPreview: React.FC = () => {
  return (
    <AbsoluteFill className="seeday-preview">
      <Sequence from={0} durationInFrames={75} premountFor={30}>
        <HookScene />
      </Sequence>
      <Sequence from={75} durationInFrames={75} premountFor={30}>
        <PlantTeaseScene />
      </Sequence>
      <Sequence from={150} durationInFrames={90} premountFor={30}>
        <TypingScene />
      </Sequence>
      <Sequence from={240} durationInFrames={90} premountFor={30}>
        <AutoSaveScene />
      </Sequence>
      <Sequence from={330} durationInFrames={105} premountFor={30}>
        <MoodMemoryScene />
      </Sequence>
      <Sequence from={435} durationInFrames={90} premountFor={30}>
        <CompanionScene />
      </Sequence>
      <Sequence from={525} durationInFrames={105} premountFor={30}>
        <TimelineScene />
      </Sequence>
      <Sequence from={630} durationInFrames={105} premountFor={30}>
        <RootsScene />
      </Sequence>
      <Sequence from={735} durationInFrames={90} premountFor={30}>
        <PlantBloomScene />
      </Sequence>
      <Sequence from={825} durationInFrames={75} premountFor={30}>
        <EndScene />
      </Sequence>
      <CutWashes cuts={[75, 150, 240, 330, 435, 525, 630, 735, 825]} />
    </AbsoluteFill>
  );
};
