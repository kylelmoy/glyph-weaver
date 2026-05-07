import type { IconType } from "react-icons";

import { HiOutlineRocketLaunch } from "react-icons/hi2";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { FaRegSave } from "react-icons/fa";
import { TbArrowsSplit } from "react-icons/tb";
import { MdOutlineRestartAlt } from "react-icons/md";
import { PiCopySimpleLight, PiDownloadSimpleLight } from "react-icons/pi";

export const iconLibrary: Record<string, IconType> = {
  rocket: HiOutlineRocketLaunch,
  github: FaGithub,
  linkedin: FaLinkedin,
  save: FaRegSave,
  split: TbArrowsSplit,
  reset: MdOutlineRestartAlt,
  copy: PiCopySimpleLight,
  download: PiDownloadSimpleLight,
};

export type IconLibrary = typeof iconLibrary;
export type IconName = keyof IconLibrary;
