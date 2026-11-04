import { socialAlt, socialCard, socialSize } from "@/lib/social-card";

export const alt = socialAlt;
export const size = socialSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return socialCard();
}
