interface Props {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}

export const QualitySelector: React.FC<Props> = ({ value, onChange, disabled }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Quality</span>
        <span>{value}%</span>
      </div>
      <input
        type="range"
        min={10}
        max={100}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="w-full"
      />
      <p className="text-[11px] text-slate-500">Lower percentages reduce file size before upload. Use 100% to preserve more detail.</p>
    </div>
  );
};
