import NotSelect from "./pattern/eye-pattern-material/not-allowed.svg";
import EyeBorderSquare from "./pattern/eye-pattern-material/eye_border_square.svg";
import EyeBorderRounded from "./pattern/eye-pattern-material/eye_border_rounded.svg";
import EyeBorderCircle from "./pattern/eye-pattern-material/eye_border_circle.svg";
import EyeDotSquare from "./pattern/eye-pattern-material/eye_dot_square.svg";
import EyeDotCircle from "./pattern/eye-pattern-material/eye_dot_circle.svg";
import EyeCircleCircle from "./pattern/mix_eye_border_dot/eye-circle-circle.svg";
import EyeCornerSquare from "./pattern/mix_eye_border_dot/eye-corner-square.svg";
import EyeLeafLeaf from "./pattern/mix_eye_border_dot/eye-leaf-leaf.svg";
import EyeSquaresSquare from "./pattern/mix_eye_border_dot/eye-squares-square.svg";
export const EYE_BORDER = [
  {
    id: "eye_border_square",
    name: "Eye Border Square",
    value: "square",
    image: EyeBorderSquare,
  },
  {
    id: "not_selected",
    name: "Not Select",
    value: "not_selected",
    image: NotSelect,
  },
  {
    id: "eye_border_rounded",
    name: "Eye Border Rounded",
    value: "extra-rounded",
    image: EyeBorderRounded,
  },
  {
    id: "eye_border_circle",
    name: "Eye Border Circle",
    value: "dot",
    image: EyeBorderCircle,
  },
];

export const EYE_DOT = [
  {
    id: "not_selected",
    name: "Not Select",
    value: "not_selected",
    image: NotSelect,
  },
  {
    id: "eye_square",
    name: "Eye Square",
    value: "square",
    image: EyeDotSquare,
  },
  {
    id: "eye_dot",
    name: "Eye Dot",
    value: "dot",
    image: EyeDotCircle,
  },
];

export const EYE_DOT_MIX_BORDER_DOT = [
  // {
  //   id: "not_selected",
  //   name: "Not Select",
  //   value: "not_selected",
  //   image: NotSelect,
  // },
  {
    id: "eye_corner_square",
    name: "Eye Corner Square",
    value: {
      cornersDotOptions: "rounded",
      cornersSquareOptions: "rounded",
    },
    image: EyeCornerSquare,
  },
  {
    id: "eye_circle_circle",
    name: "Eye Circle Circle",
    value: {
      cornersDotOptions: "dot",
      cornersSquareOptions: "dot",
    },
    image: EyeCircleCircle,
  },
  {
    id: "eye_squares_square",
    name: "Eye Squares Square",
    value: {
      cornersDotOptions: "square",
      cornersSquareOptions: "square",
    },
    image: EyeSquaresSquare,
  },
  {
    id: "eye_leaf_leaf",
    name: "Eye Leaf Leaf",
    value: {
      cornersDotOptions: "classy-rounded",
      cornersSquareOptions: "classy-rounded",
    },
    image: EyeLeafLeaf,
  },
];
