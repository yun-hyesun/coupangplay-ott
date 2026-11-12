import { useEffect, useId, useRef, useState } from 'react';
import CommonIcon from './CommonIcon';
import './SeasonSelect.scss';

export const SeasonSelect = ({ seasons = [], value, onChange }) => {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const optionsRef = useRef([]);
  const listId = useId();
  const items = seasons.filter(item => item.season_number >= 0);
  const options = items.length ? items : [{ id: 'default', season_number: 1, name: '시즌 1' }];
  const selected = options.findIndex(item => String(item.season_number) === String(value));
  const selectedItem = options[selected] || options[0];
  useEffect(() => {
    if (!open) return;
    optionsRef.current[Math.max(0, selected)]?.focus();
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, selected]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const move = (event, index) => {
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % options.length;
    if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = options.length - 1;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (next !== undefined) { event.preventDefault(); optionsRef.current[next]?.focus(); }
  };
  return <div ref={root} className={`season-select${open ? ' is-open' : ''}`}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="season-select__trigger" aria-haspopup="listbox" aria-expanded={open}
      aria-controls={listId} aria-label={`시즌 선택: ${selectedItem.name || `시즌 ${selectedItem.season_number}`}`}
      onClick={() => setOpen(previous => !previous)}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }}>
      <span>{selectedItem.name || `시즌 ${selectedItem.season_number}`}</span>
      <CommonIcon name={open ? 'chevron-up' : 'chevron-down'} size={16} />
    </button>
    {open && <ul id={listId} className="season-select__list" role="listbox" aria-label="시즌 선택">
      {options.map((item, index) => <li key={item.id ?? item.season_number} role="none">
        <button ref={element => { optionsRef.current[index] = element; }} type="button" role="option"
          className="season-select__option" aria-selected={index === selected} tabIndex={-1}
          onKeyDown={event => move(event, index)}
          onClick={() => { onChange(String(item.season_number)); close(); }}>
          <span>{item.name || `시즌 ${item.season_number}`}</span>
          {index === selected && <CommonIcon name="check" size={16} />}
        </button>
      </li>)}
    </ul>}
  </div>;
};
