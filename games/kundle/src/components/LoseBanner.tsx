interface LoseBannerProps {
  targetName: string;
}

export function LoseBanner({ targetName }: LoseBannerProps) {
  return (
    <div className="win-banner win-banner--lose">
      <p className="win-banner__name">
        Today's client was <strong>{targetName}</strong>
      </p>
    </div>
  );
}
