interface SvgHelperProps {
  href: string;
  title: string;
  data?: string;
}

export default function SvgHelper(svgProps: SvgHelperProps) {
  const { href, title, data } = svgProps;
  return (
    <>
      {data ? <span dangerouslySetInnerHTML={{ __html: data }} hidden /> : null}
      <svg role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
        <title>{title}</title>
        <use href={href} width="100" height="100" />
      </svg>
    </>
  );
}
