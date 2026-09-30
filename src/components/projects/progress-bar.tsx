/** Barra fina roxa do progresso de um projeto — o número fica ao lado, em texto. */
export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-[5px] w-full overflow-hidden rounded-full bg-white/10"
    >
      <div className="h-full rounded-full bg-plum-ink transition-[width] duration-(--duration-base)" style={{ width: `${percent}%` }} />
    </div>
  );
}
