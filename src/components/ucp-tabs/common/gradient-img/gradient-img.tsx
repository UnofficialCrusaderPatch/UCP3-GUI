import './gradient-img.css';

interface GradientImgProps {
  src: string;
  type: 'tab' | 'header';
}

export default function GradientImg(gradientImgProps: GradientImgProps) {
  const { src, type } = gradientImgProps;
  return !src ? null : (
    <img
      src={src}
      alt=""
      className={`gradient-img ${type === 'header' ? 'gradient-img--header' : 'gradient-img--tab'}`}
    />
  );
}
