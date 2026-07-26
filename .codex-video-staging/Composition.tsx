import {Composition} from "remotion";
import {SeedayPreview} from "./SeedayPreview";

export const MyComposition: React.FC = () => {
  return (
    <Composition
      id="SeedayPreviewV1"
      component={SeedayPreview}
      durationInFrames={900}
      fps={30}
      width={888}
      height={1920}
    />
  );
};
