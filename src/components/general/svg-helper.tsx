interface SvgHelperProps {
  href: string;
  title: string;
}

export default function SvgHelper(svgProps: SvgHelperProps) {
  const { href, title } = svgProps;
  return (
    <svg role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
      <title>{title}</title>
      <use href={href} width="100" height="100" />
    </svg>
  );
}
