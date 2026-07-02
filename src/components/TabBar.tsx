interface TabBarProps {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
}

/** Universal underline tab bar — used in Anime Detail (Overview/Characters/Episodes/Reviews).
 *  Uses .tab-bar and .tab-bar__item CSS classes from index.css.
 */
export default function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          className={`tab-bar__item${active === tab ? ' active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
