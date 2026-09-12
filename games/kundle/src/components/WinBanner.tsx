interface WinBannerProps {
  targetName: string;
}

export function WinBanner({ targetName }: WinBannerProps) {
  return (
    <div className="win-banner">
      <p className="win-banner__headline">🎉 You found today's client!</p>
      <p className="win-banner__name">{targetName}</p>
    </div>
  );
}
