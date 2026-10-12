import OrbLitApp from "@/components/OrbLitApp";
import UserMenu from "@/components/UserMenu";
import FeedbackButton from "@/components/FeedbackButton";
import RefAttacher from "@/components/RefAttacher";
import { isLocalMode } from "@/lib/mode";

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
  const localMode = isLocalMode();
  return (
    <>
      {localMode ? null : <RefAttacher />}
      <div style={topRightBarStyle}>
        {localMode ? null : <FeedbackButton />}
        {localMode ? null : <UserMenu />}
      </div>
      <OrbLitApp localMode={localMode} />
    </>
  );
}
