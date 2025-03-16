import { Accordion, Flex } from "@chakra-ui/react";
import { IconInfoCircle } from "@tabler/icons-react";
import { FC } from "react";

//Render the iframe of the video
const VideoPlayer: FC<{
  videoLink: string;
}> = ({ videoLink }) => {
  //const isEmbeddable =

  const processedVideoLink = videoLink.replace("watch?v=", "embed/");

  return (
    <Accordion.Root collapsible>
      <Accordion.Item value="1">
        <Accordion.ItemTrigger>
          <Flex flex="1">
            <IconInfoCircle /> Explanation Video
          </Flex>
          <Accordion.ItemIndicator />
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          <iframe src={processedVideoLink} width="100%" height="100%"></iframe>
        </Accordion.ItemContent>
      </Accordion.Item>
    </Accordion.Root>
  );
};

export default VideoPlayer;
