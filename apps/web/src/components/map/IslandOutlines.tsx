/** 독도의 원본 두 경계를 같은 좌표에 확대해 작은 화면에서도 형태를 보이게 한다. */
export function IslandOutlines({ province, className = "fill-map-empty" }: { province: string | null; className?: string }) {
  if (province && province !== "47") return null;
  const code = province === "47" ? "47940" : "47";
  const name = province === "47" ? "울릉군" : "경상북도";
  return <g transform="translate(6474 1503) scale(18) translate(-6474 -1503)" className={`${className} stroke-map-line`} aria-hidden="true">
    <path d="M6477.4,1502.9L6477.8,1502.7L6478.2,1503.4L6477.1,1505.4L6476.9,1505.5L6476.8,1505.5L6476.7,1505.5L6475.6,1504.5L6475.4,1504.3L6475.6,1503.1L6475.9,1502.5L6475.9,1502.4L6476.2,1502.2L6476.4,1502L6477.2,1501.5L6477.3,1501.6L6477.2,1502L6477.2,1502.2L6476.9,1503.2Z" data-code={code} data-name={name} strokeWidth="1" vectorEffect="non-scaling-stroke" />
    <path d="M6470.9,1503L6470.9,1501.3L6471.1,1500.7L6472.6,1499L6472.8,1499L6473,1499.2L6473.4,1499.7L6473.5,1499.9L6473.6,1500.7L6473.5,1500.8L6474.1,1501.7L6473.2,1503.2L6473.1,1503.3L6472.8,1503.6L6472.7,1503.6L6471.1,1503.2Z" data-code={code} data-name={name} strokeWidth="1" vectorEffect="non-scaling-stroke" />
  </g>;
}
