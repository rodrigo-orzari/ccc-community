'use client';

import React from 'react';
import { ChevronDown, Info } from 'lucide-react';

// Shared filter controls for every filtering surface on the site (catalog sidebar,
// compliance, datacenters, workloads).
//
// Interaction model — deliberately additive:
//   • Nothing checked in a section means "no constraint", NOT "no results". The
//     query builder (buildPricingFilters) already treats an empty array as
//     unconstrained, so empty state and all-selected state return identical rows.
//   • Selection state is a checkbox (multi) or radio (single), never a filled pill —
//     a filled pill reads as a button to press, not as a checked state.
//   • "Only" is a visible per-row link, replacing the old hidden double-click-to-isolate.
//   • Counts next to each option tell the user what a filter will do before clicking.

export const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [show, setShow] = React.useState(false);
  return (
    <span
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(!show); }}
    >
      {children}
      {show && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-[140px] p-1.5 bg-[#1e1e38] dark:bg-[#dde0f0] text-[#f7f8ff] dark:text-black text-[10px] rounded shadow-lg z-50 font-normal tracking-normal normal-case text-left leading-relaxed">
          {text}
          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-r-[4px] border-t-transparent border-b-transparent border-r-[#1e1e38] dark:border-r-[#dde0f0]"></div>
        </div>
      )}
    </span>
  );
};

// Count lookup for one facet. Returns `undefined` when counts haven't been supplied
// for this facet at all (facet unsupported / still loading) — callers treat that as
// "don't hide anything". Returns 0 when counts ARE loaded but this option isn't in
// them, which genuinely means "selecting this returns nothing".
//
// The case-insensitive fallback exists because DB values and the hardcoded UI
// constants don't always agree on casing (e.g. 'linux' vs 'Linux'); without it a
// casing mismatch would read as zero and wrongly hide a working option.
const makeCountLookup = (counts?: Record<string, number>) => {
  if (!counts) return undefined;
  const lower = new Map<string, number>();
  for (const [k, v] of Object.entries(counts)) lower.set(k.toLowerCase(), v);
  return (option: string): number => {
    const direct = counts[option];
    if (typeof direct === 'number') return direct;
    return lower.get(option.toLowerCase()) ?? 0;
  };
};

/**
 * STANDING RULE: every filter section on the site renders its options in
 * alphabetical order. Catalog sidebar, workloads, datacenters, compliance — no
 * exceptions by default.
 *
 * Applied here rather than by reordering the ~40 arrays in config/index.ts, so
 * the config keeps stating the domain order while exactly one place governs
 * presentation. Note this is also why useDynamicFilters.merge() must NOT sort:
 * two sort sites fighting each other is what previously left Model Tier
 * unsorted altogether.
 *
 * localeCompare with numeric collation, so 'Item 2' precedes 'Item 10' and
 * casing differences don't split the order.
 *
 * `preserveOrder` exists for callers that own their sequence — currently only
 * the Provider facet, whose hyperscaler/specialized grouping comes from
 * compareProvidersForDisplay (and which is already alphabetical within each
 * group). Reach for it sparingly; the default is the rule.
 */
const collate = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// Sorts by the LABEL the user actually reads, not the raw option value. Several
// facets render an id ('gcp') as a display name ('Google'); sorting the id would
// produce an order that looks arbitrary on screen.
const orderOptions = (
  options: string[],
  preserveOrder: boolean,
  getLabel?: (option: string) => string,
) =>
  preserveOrder
    ? options
    : [...options].sort((a, b) => collate(getLabel?.(a) ?? a, getLabel?.(b) ?? b));

// Shown when every option in an additive facet is checked. Without it, "Select all"
// looks broken: the boxes tick but the results never move, because everything-checked
// and nothing-checked are the same query. This says so plainly and points at the
// reason you'd use it — unchecking a few to exclude them.
const ExcludeHint = () => (
  <p className="text-[10px] leading-snug text-[#737373] dark:text-[#a3a3a3] pl-1.5 pr-1">
    Same results as nothing checked. Uncheck an option to leave it out.
  </p>
);

const SectionHeader = ({
  title,
  tooltip,
  isExpanded,
  onToggleExpand,
  onSelectAll,
  onClearAll,
  hasSelection,
  selectAllTitle,
}: {
  title: string;
  tooltip?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  hasSelection: boolean;
  selectAllTitle?: string;
}) => (
  <div className="flex items-center justify-between gap-2">
    <h2 className="m-0 min-w-0">
      <button
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        className="text-left text-[10px] font-bold text-[#737373] uppercase tracking-widest flex items-center gap-1.5 hover:text-black dark:hover:text-[#f7f8ff] transition-colors cursor-pointer"
      >
        <ChevronDown size={10} className={`transition-transform shrink-0 ${isExpanded ? '' : '-rotate-90'}`} />
        <span className="truncate">{title}</span>
        {hasSelection && (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#2563eb] dark:bg-[#818cf8]" aria-label="filter active" />
        )}
        {tooltip && <Tooltip text={tooltip}><Info size={10} className="cursor-help shrink-0" /></Tooltip>}
      </button>
    </h2>
    {isExpanded && (onSelectAll || onClearAll) && (
      <span className="text-[10px] font-medium shrink-0 whitespace-nowrap">
        {onSelectAll && (
          <button
            onClick={onSelectAll}
            title={selectAllTitle}
            className="text-[#2563eb] dark:text-[#818cf8] hover:underline cursor-pointer"
          >
            Select all
          </button>
        )}
        {onSelectAll && onClearAll && <span className="text-[#a3a3a3] dark:text-[#525252] mx-1.5">|</span>}
        {onClearAll && (
          <button
            onClick={onClearAll}
            disabled={!hasSelection}
            className={`transition-colors ${
              hasSelection
                ? 'text-[#2563eb] dark:text-[#818cf8] hover:underline cursor-pointer'
                : 'text-[#a3a3a3] dark:text-[#525252] cursor-default'
            }`}
          >
            Clear all
          </button>
        )}
      </span>
    )}
  </div>
);

const OptionRow = ({
  type,
  name,
  label,
  checked,
  disabled,
  count,
  onChange,
  onOnly,
}: {
  type: 'checkbox' | 'radio';
  name?: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  count?: number;
  onChange: () => void;
  onOnly?: () => void;
}) => (
  <label
    className={`group flex items-center gap-2.5 px-1.5 py-[5px] rounded transition-colors ${
      disabled
        ? 'opacity-40 cursor-not-allowed'
        : 'cursor-pointer hover:bg-[#dde0f0]/60 dark:hover:bg-[#1e1e38]/60'
    }`}
  >
    <input
      type={type}
      name={name}
      checked={checked}
      disabled={disabled}
      onChange={() => !disabled && onChange()}
      className="shrink-0 w-[13px] h-[13px] accent-[#2563eb] dark:accent-[#818cf8] cursor-pointer disabled:cursor-not-allowed"
    />
    <span className="flex-1 min-w-0 text-[11px] leading-tight text-[#171717] dark:text-[#e5e7eb] truncate">
      {label}
    </span>
    {onOnly && !disabled && (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOnly(); }}
        className="hidden group-hover:inline text-[10px] font-medium text-[#2563eb] dark:text-[#818cf8] hover:underline shrink-0 cursor-pointer"
      >
        only
      </button>
    )}
    {typeof count === 'number' && (
      <span className={`text-[10px] tabular-nums text-[#a3a3a3] dark:text-[#525252] shrink-0 ${onOnly && !disabled ? 'group-hover:hidden' : ''}`}>
        {count.toLocaleString()}
      </span>
    )}
  </label>
);

export interface CheckboxFilterSectionProps {
  title: string;
  tooltip?: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onSetAll: (items: string[]) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  disabledOptions?: string[];
  getLabel?: (option: string) => string;
  counts?: Record<string, number>;
  // For facets whose option ids differ from the raw values counts are keyed by.
  // e.g. the CPU filter's 'arm' profile covers DB cpu_vendor values ['AWS','Ampere'],
  // so without this its count would resolve to 0 and the option would be hidden even
  // though ARM instances exist.
  countValues?: Record<string, string[]>;
  // Whether an empty selection means "no constraint" (true, the default — normal
  // additive filtering) or literally "none selected" (false).
  //
  // When true, checking every box produces exactly the same result set as checking
  // none, so a "Select all" link is a guaranteed no-op — it ticks the boxes and the
  // results never move, which reads as broken. It's hidden in that case.
  //
  // Set false for selection UIs where empty really does mean none — e.g. picking
  // which provider columns appear in the workload comparison table — where "Select
  // all" is a genuine action that brings content back.
  emptyMeansAll?: boolean;
  // Set when the option sequence carries meaning (numeric ranges, tier ladders,
  // deliberate groupings). Everything else renders alphabetically. See orderOptions.
  preserveOrder?: boolean;
}

// Multi-select facet. Empty selection === no constraint.
export const CheckboxFilterSection = ({
  title,
  tooltip,
  options,
  selected,
  onToggle,
  onSetAll,
  isExpanded,
  onToggleExpand,
  disabledOptions = [],
  getLabel,
  counts,
  countValues,
  emptyMeansAll = true,
  preserveOrder = false,
}: CheckboxFilterSectionProps) => {
  const rawCountOf = makeCountLookup(counts);
  const countOf = rawCountOf
    ? (option: string) => (countValues?.[option] ?? [option]).reduce((sum, v) => sum + rawCountOf(v), 0)
    : undefined;
  // Static facets: every option always renders. Only the count next to it (via
  // countOf, passed to OptionRow below) reflects the current selection, down to 0.
  const shown = orderOptions(options, preserveOrder, getLabel);
  const selectable = shown.filter(o => !disabledOptions.includes(o));
  const allSelected = selectable.length > 0 && selectable.every(o => selected.includes(o));

  return (
    <section className="space-y-2">
      <SectionHeader
        title={title}
        tooltip={tooltip}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onSelectAll={() => onSetAll(shown.filter(o => !disabledOptions.includes(o)))}
        onClearAll={() => onSetAll([])}
        hasSelection={selected.length > 0}
        selectAllTitle={
          emptyMeansAll
            ? 'Check every option, then uncheck the few you want to leave out. Same results as nothing checked.'
            : undefined
        }
      />
      {isExpanded && (
        <div className="flex flex-col">
          {shown.map(option => (
            <OptionRow
              key={option}
              type="checkbox"
              label={getLabel ? getLabel(option) : option}
              checked={selected.includes(option)}
              disabled={disabledOptions.includes(option)}
              count={countOf ? countOf(option) : undefined}
              onChange={() => onToggle(option)}
              onOnly={() => onSetAll([option])}
            />
          ))}
        </div>
      )}
      {isExpanded && emptyMeansAll && allSelected && (
        <ExcludeHint />
      )}
    </section>
  );
};

export interface GroupedCheckboxFilterSectionProps {
  title: string;
  tooltip?: string;
  groups: { label: string; services: string[] }[];
  allOptions: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onSetAll: (items: string[]) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  disabledOptions?: string[];
  getLabel?: (option: string) => string;
  counts?: Record<string, number>;
  // When provided, each rendered option is a canonical control covering the mapped
  // set of raw values (e.g. one "Enterprise" row selects Enterprise / Enterprise
  // Edition / Enterprise Plus together).
  optionValues?: Record<string, string[]>;
  // See CheckboxFilterSectionProps.emptyMeansAll — hides the no-op "Select all".
  emptyMeansAll?: boolean;
  // Preserves BOTH the group order and the option order within each group.
  // Used by Provider, whose grouping (hyperscalers first, then specialized) and
  // in-group order come from compareProvidersForDisplay and are deliberate.
  preserveOrder?: boolean;
}

// Multi-select facet organized under labeled sub-groups (Kayak's Seattle/Chicago pattern).
export const GroupedCheckboxFilterSection = ({
  title,
  tooltip,
  groups,
  allOptions,
  selected,
  onToggle,
  onSetAll,
  isExpanded,
  onToggleExpand,
  disabledOptions = [],
  getLabel,
  counts,
  optionValues,
  emptyMeansAll = true,
  preserveOrder = false,
}: GroupedCheckboxFilterSectionProps) => {
  // Sort within each group, and the groups themselves — a grouped facet is still
  // scanned by name. Skipped entirely when the caller owns the ordering.
  const orderedGroups = preserveOrder
    ? groups
    : [...groups]
        .map(g => ({ ...g, services: orderOptions(g.services, false, getLabel) }))
        .sort((a, b) => collate(a.label, b.label));
  const valuesFor = (option: string) => optionValues?.[option] ?? [option];
  const isOn = (option: string) => {
    const vs = valuesFor(option);
    return vs.length > 0 && vs.every(v => selected.includes(v));
  };
  const handleToggle = (option: string) => {
    if (!optionValues) { onToggle(option); return; }
    const vs = valuesFor(option);
    if (isOn(option)) onSetAll(selected.filter(v => !vs.includes(v)));
    else onSetAll(Array.from(new Set([...selected, ...vs])));
  };
  // A canonical row covers several raw values, so its count is their sum.
  const countOf = makeCountLookup(counts);
  const countFor = (option: string) =>
    countOf ? valuesFor(option).reduce((sum, v) => sum + countOf(v), 0) : undefined;

  // Static facets: every group and option always renders. countFor (used by
  // OptionRow below) still reflects the current selection, down to 0.
  const shownGroups = orderedGroups;

  const shownFlat = shownGroups.flatMap(g => g.services);
  const selectableFlat = shownFlat.filter(o => !disabledOptions.includes(o));
  const allShownSelected = selectableFlat.length > 0 && selectableFlat.every(o => isOn(o));

  return (
    <section className="space-y-2">
      <SectionHeader
        title={title}
        tooltip={tooltip}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onSelectAll={() =>
          onSetAll(
            Array.from(new Set(
              (countOf ? shownFlat : allOptions)
                .filter(o => !disabledOptions.includes(o))
                .flatMap(o => valuesFor(o)),
            )),
          )
        }
        onClearAll={() => onSetAll([])}
        hasSelection={selected.length > 0}
        selectAllTitle={
          emptyMeansAll
            ? 'Check every option, then uncheck the few you want to leave out. Same results as nothing checked.'
            : undefined
        }
      />
      {isExpanded && (
        <div className="flex flex-col gap-2.5">
          {shownGroups.map(group => (
            <div key={group.label} className="flex flex-col">
              <div className="text-[9px] font-bold text-[#a3a3a3] dark:text-[#525252] uppercase tracking-widest pl-1.5 mb-0.5">
                {group.label}
              </div>
              {group.services.map(option => (
                <OptionRow
                  key={option}
                  type="checkbox"
                  label={getLabel ? getLabel(option) : option}
                  checked={isOn(option)}
                  disabled={disabledOptions.includes(option)}
                  count={countFor(option)}
                  onChange={() => handleToggle(option)}
                  onOnly={() => onSetAll(valuesFor(option))}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {isExpanded && emptyMeansAll && allShownSelected && (
        <ExcludeHint />
      )}
    </section>
  );
};

export interface RadioFilterSectionProps {
  title: string;
  tooltip?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  disabledOptions?: string[];
  getLabel?: (option: string) => string;
  counts?: Record<string, number>;
  // Radio groups need a DOM-unique name so two groups on one page don't interfere.
  name: string;
  // Defaults to false, same as CheckboxFilterSection: every filter section on the
  // site sorts alphabetically. Pass true only if a specific group must keep a
  // caller-defined sequence.
  preserveOrder?: boolean;
}

// Single-select facet — mutually exclusive values (workload priority levels, region,
// pricing model). Round control signals "pick exactly one"; there is no "only" link
// and no Select all, because both are meaningless for a single choice.
export const RadioFilterSection = ({
  title,
  tooltip,
  options,
  value,
  onChange,
  isExpanded,
  onToggleExpand,
  disabledOptions = [],
  getLabel,
  counts,
  name,
  preserveOrder = false,
}: RadioFilterSectionProps) => (
  <section className="space-y-2">
    <SectionHeader
      title={title}
      tooltip={tooltip}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      hasSelection={false}
    />
    {isExpanded && (
      <div className="flex flex-col" role="radiogroup" aria-label={title}>
        {orderOptions(options, preserveOrder, getLabel).map(option => (
          <OptionRow
            key={option}
            type="radio"
            name={name}
            label={getLabel ? getLabel(option) : option}
            checked={value === option}
            disabled={disabledOptions.includes(option)}
            count={counts?.[option]}
            onChange={() => onChange(option)}
          />
        ))}
      </div>
    )}
  </section>
);

export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

// Running summary of everything currently constraining the result set, so "is a
// filter on?" is answerable without scrolling the whole sidebar.
export const ActiveFilterSummary = ({
  chips,
  onClearAll,
}: {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
}) => {
  if (chips.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-[#737373] uppercase tracking-widest">
          Active filters
        </span>
        <button
          onClick={onClearAll}
          className="text-[10px] font-medium text-[#2563eb] dark:text-[#818cf8] hover:underline shrink-0 cursor-pointer"
        >
          Reset all
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(chip => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded text-[10px] font-medium bg-[#dde0f0] dark:bg-[#1e1e38] text-[#171717] dark:text-[#e5e7eb]"
          >
            <span className="truncate max-w-[130px]">{chip.label}</span>
            <button
              onClick={chip.onRemove}
              aria-label={`Remove ${chip.label} filter`}
              className="text-[#737373] hover:text-black dark:hover:text-[#f7f8ff] transition-colors leading-none cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </section>
  );
};
