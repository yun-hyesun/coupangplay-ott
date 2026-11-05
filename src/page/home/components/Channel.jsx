import { Link } from "react-router-dom";
import { useHorizontalDragScroll } from "../../../hooks/useHorizontalDragScroll";

const channelList = [
  { img: "/images/channal01.svg", art: "EBS ON", path: "/ebs" },
  { img: "/images/channal02.svg", art: "스포츠패스", path: "/sports" },
  { img: "/images/channal03.svg", art: "키즈+", path: "/kids" },
  { img: "/images/channal04.svg", art: "Adult", path: "/adult" },
  { img: "/images/channal05.svg", art: "K LEAGUE 1", path: "/kleague" },
  { img: "/images/channal07.svg", art: "JTBC", path: "/jtbc" },
  { img: "/images/channal08.svg", art: "CBS", path: "/cbs" },
  { img: "/images/channal09.svg", art: "SONY PICTURES", path: "/sony" },
  { img: "/images/channal10.svg", art: "M.OA", path: "/moa" },
  { img: "/images/channal11.svg", art: "JPlus", path: "/jplus" },
  { img: "/images/channal12.svg", art: "HBO", path: "/hbo" },
];

export const Channel = () => {
  const channelDrag = useHorizontalDragScroll();

  return (
    <div className="channel">
      <div
        className={
          "channel-flex" + (channelDrag.isDragging ? " is-dragging" : "")
        }
        ref={channelDrag.scrollRef}
        tabIndex={0}
        aria-label="채널 바로가기"
        onPointerDown={channelDrag.onPointerDown}
        onClickCapture={channelDrag.onClickCapture}
        onDragStart={channelDrag.onDragStart}
      >
        {channelList.map((channel) => (
          <Link
            to={channel.path}
            key={channel.path}
            className="channel-item"
          >
            <img src={channel.img} alt={channel.art} draggable={false} />
          </Link>
        ))}
      </div>
    </div>
  );
};