import type { IconType } from "react-icons";

import {
  HiOutlineRocketLaunch,
} from "react-icons/hi2";
import { FaGithub, FaLinkedin } from "react-icons/fa6";


export const iconLibrary: Record<string, IconType> = {
  rocket: HiOutlineRocketLaunch,
  github: FaGithub,
  linkedin: FaLinkedin,
};

export type IconLibrary = typeof iconLibrary;
export type IconName = keyof IconLibrary;