'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Plus } from 'lucide-react';

/**
 * Komponen SearchableSelect (Combobox) Mobile-Friendly
 * Menggantikan <select> bawaan: pengguna bisa langsung mengetik nama / teks untuk memfilter opsi,
 * atau langsung menggunakan teks baru yang diketik jika belum ada di opsi.
 */
export default function SearchableSelect({
  options = [],
  value = '',
  valueKey,
  onChange,
  placeholder = 'Pilih atau ketik nama...',
  searchPlaceholder = 'Ketik untuk mencari...',
  displayKey = 'name',
  secondaryKey = '',
  badgeKey = '',
  badgeRenderer,
  allowCustom = true,
  customLabel = 'Gunakan sebagai baru',
  onCustomSelect,
  disabled = false,
  required = false,
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Helper mendapatkan value dari sebuah item opsi
  const getItemValue = (item) => {
    if (!item) return '';
    if (valueKey && item[valueKey] !== undefined) return item[valueKey];
    if (item.id !== undefined && !valueKey) return item.id;
    return item[displayKey] ?? '';
  };

  // Cari item yang sedang terpilih
  const selectedItem = useMemo(() => {
    if (!value) return null;
    const vStr = String(value).trim().toLowerCase();
    const cleanVStr = vStr.replace(/\s+/g, '');
    return options.find((opt) => {
      const valStr = String(getItemValue(opt)).trim().toLowerCase();
      const dispStr = String(opt[displayKey] || '').trim().toLowerCase();
      const idStr = opt.id != null ? String(opt.id).trim().toLowerCase() : '';
      return (
        valStr === vStr ||
        valStr.replace(/\s+/g, '') === cleanVStr ||
        dispStr === vStr ||
        dispStr.replace(/\s+/g, '') === cleanVStr ||
        idStr === vStr
      );
    }) || null;
  }, [options, value, displayKey, valueKey]);

  // Label yang ditampilkan di tombol pemicu dropdown
  const displayLabel = useMemo(() => {
    if (selectedItem) {
      const sec = secondaryKey && selectedItem[secondaryKey] ? ` (${selectedItem[secondaryKey]})` : '';
      return `${selectedItem[displayKey]}${sec}`;
    }
    if (value && typeof value === 'string') {
      return value;
    }
    return '';
  }, [selectedItem, value, displayKey, secondaryKey]);

  // Filter opsi berdasarkan teks pencarian (mencari nopol, merk, tipe, nama, no hp)
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    const cleanQ = q.replace(/\s+/g, '');
    return options.filter((opt) => {
      const mainText = String(opt[displayKey] || '').toLowerCase();
      const secText = secondaryKey ? String(opt[secondaryKey] || '').toLowerCase() : '';
      const brandText = opt.brand ? String(opt.brand).toLowerCase() : '';
      const modelText = opt.model ? String(opt.model).toLowerCase() : '';
      const phoneText = opt.phone ? String(opt.phone).toLowerCase() : '';
      return (
        mainText.includes(q) ||
        mainText.replace(/\s+/g, '').includes(cleanQ) ||
        secText.includes(q) ||
        brandText.includes(q) ||
        modelText.includes(q) ||
        phoneText.includes(q)
      );
    });
  }, [options, query, displayKey, secondaryKey]);

  // Cek apakah teks yang diketik persis cocok dengan salah satu opsi yang ada
  const hasExactMatch = useMemo(() => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return options.some(
      (opt) => String(opt[displayKey] || '').toLowerCase().trim() === q
    );
  }, [options, query, displayKey]);

  // Tutup dropdown jika klik di luar komponen
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Fokuskan input pencarian saat dropdown dibuka
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleSelectItem = (item) => {
    const val = getItemValue(item);
    if (onChange) onChange(val, item);
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (onCustomSelect) {
      onCustomSelect(trimmed);
    } else if (onChange) {
      onChange(trimmed, null);
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) onChange('', null);
    if (onCustomSelect) onCustomSelect('');
    setQuery('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Tombol Pemicu Dropdown */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: '44px',
          padding: '8px 12px',
          background: disabled ? 'var(--bg-input)' : '#ffffff',
          border: isOpen ? '1.5px solid var(--primary)' : '1px solid var(--border)',
          borderRadius: '10px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(5, 150, 105, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          {displayLabel ? (
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayLabel}
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {placeholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {displayLabel && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Bersihkan Pilihan"
              style={{
                border: 'none',
                background: 'transparent',
                padding: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)'
              }}
            >
              <X size={15} />
            </button>
          )}
          <ChevronDown 
            size={16} 
            color="var(--text-muted)" 
            style={{ 
              transition: 'transform 0.2s ease', 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' 
            }} 
          />
        </div>
      </div>

      {/* Menu Dropdown Searchable */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 60,
            background: '#ffffff',
            borderRadius: '12px',
            border: '1.5px solid var(--primary-border)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {/* Kolom Pencarian Cepat */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px' }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredOptions.length > 0) {
                      handleSelectItem(filteredOptions[0]);
                    } else if (allowCustom && query.trim()) {
                      handleSelectCustom();
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: '#ffffff',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Opsi Khusus: Ketik Nama Baru */}
          {allowCustom && query.trim() && !hasExactMatch && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleSelectCustom}
              style={{
                padding: '10px 12px',
                borderBottom: '1px dashed var(--border)',
                background: 'rgba(5, 150, 105, 0.05)',
                color: 'var(--primary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={16} />
              <span>Gunakan &quot;{query.trim()}&quot; ({customLabel})</span>
            </div>
          )}

          {/* Daftar Opsi Tersaring */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                {allowCustom ? 'Tekan enter atau klik opsi di atas untuk menggunakan nama ini' : 'Tidak ada data ditemukan'}
              </div>
            ) : (
              filteredOptions.map((item, idx) => {
                const itemVal = item.id != null ? item.id : item[displayKey];
                const isSelected = selectedItem ? selectedItem.id === item.id : value === itemVal;

                return (
                  <div
                    key={item.id || item[displayKey] || idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectItem(item)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isSelected ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-card)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600 }}>
                        {item[displayKey]}
                      </div>
                      {secondaryKey && item[secondaryKey] && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item[secondaryKey]}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {badgeRenderer ? (
                        badgeRenderer(item)
                      ) : badgeKey && item[badgeKey] ? (
                        <span className="badge" style={{ fontSize: '10px' }}>
                          {item[badgeKey]}
                        </span>
                      ) : null}

                      {isSelected && <Check size={16} color="var(--primary)" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
