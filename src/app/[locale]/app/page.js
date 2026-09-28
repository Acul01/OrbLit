import OrbLitApp from "@/components/OrbLitApp";
import UserMenu from "@/components/UserMenu";
import FeedbackButton from "@/components/FeedbackButton";
import RefAttacher from "@/components/RefAttacher";

const topRightBarStyle = {
  position: "fixed",
  top: 8,
  right: 8,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export default function AppPage() {
  return (
    <>
      <RefAttacher />
      <div style={topRightBarStyle}>
        <FeedbackButton />
        <UserMenu />
      </div>
      <OrbLitApp />
    </>
  );
}
