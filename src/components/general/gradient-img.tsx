import './gradient-img.css';

interface GradientImgProps {
  src: string;
  basedOnWidth?: boolean;
}

export default function GradientImg(gradientImgProps: GradientImgProps) {
  const { src, basedOnWidth } = gradientImgProps;
  return !src ? null : (
    <img
      src={src}
      alt=""
      className={`gradient-img${basedOnWidth ? ' gradient-img--width' : ''}`}
    />
  );
}
