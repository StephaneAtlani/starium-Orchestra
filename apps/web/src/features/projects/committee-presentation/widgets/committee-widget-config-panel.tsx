'use client';

import type { CommitteeWidgetDefinition, WidgetId } from './committee-widget-registry';
import { WIDGET_THEME_LABEL, WIDGET_THEME_ORDER } from './committee-widget-themes';

type Props = {
  widgets: CommitteeWidgetDefinition[];
  hiddenWidgets: WidgetId[];
  onToggle: (id: WidgetId) => void;
};

export function CommitteeWidgetConfigPanel({ widgets, hiddenWidgets, onToggle }: Props) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Visibilité des widgets
      </p>
      <div className="space-y-3">
        {WIDGET_THEME_ORDER.map((theme) => {
          const entries = widgets.filter((w) => w.theme === theme);
          if (entries.length === 0) return null;
          return (
            <section key={theme}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {WIDGET_THEME_LABEL[theme]}
              </h4>
              <div className="flex flex-wrap gap-2">
                {entries.map((widget) => (
                  <label
                    key={widget.id}
                    className="inline-flex items-start gap-2 rounded border border-border/70 px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenWidgets.includes(widget.id)}
                      onChange={() => onToggle(widget.id)}
                      className="mt-0.5"
                    />
                    <span className="leading-tight">
                      <span className="block font-medium">{widget.title}</span>
                      {widget.description ? (
                        <span className="text-muted-foreground">{widget.description}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
