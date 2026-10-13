'use client'
// CR-029: The new selection fields of the targeting section, shared by the benefit form and the
// hero form (they share TargetingRule). Controlled: the form owns the state.

import styles from '@/components/admin/AdminTable.module.css'
import type { SelectionFieldsValue } from '@/lib/admin/selectionFields'
import { selectionFieldsProblem } from '@/lib/admin/selectionFields'
import { HOUSING_TYPE_LABELS } from '@/lib/identity/labels'

export type BenefitOption = { id: string; title: string }

type Props = {
  value: SelectionFieldsValue
  onChange: (next: SelectionFieldsValue) => void
  benefitOptions: BenefitOption[]
  // The hero rule has no benefit of its own, so "hide if already chosen" only applies to benefits.
  showHideIfChosen: boolean
  // Do not offer the benefit itself as a cross-sell condition.
  excludeBenefitId?: string
}

const checkboxLabel = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
  fontSize: 'var(--font-sm)',
  cursor: 'pointer',
} as const

function toggle(list: string[], item: string, on: boolean): string[] {
  return on ? [...list, item] : list.filter((x) => x !== item)
}

export function SelectionFields({ value, onChange, benefitOptions, showHideIfChosen, excludeBenefitId }: Props) {
  const problem = selectionFieldsProblem(value)
  const options = benefitOptions.filter((b) => b.id !== excludeBenefitId)

  return (
    <>
      <div className={styles.field}>
        <label className={styles.label}>Dager siden flytting</label>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            type="number"
            step="1"
            value={value.daysSinceMoveMin}
            onChange={(e) => onChange({ ...value, daysSinceMoveMin: e.target.value })}
            placeholder="Fra (f.eks. 0)"
            aria-label="Dager siden flytting, fra"
          />
          <input
            className={styles.input}
            type="number"
            step="1"
            value={value.daysSinceMoveMax}
            onChange={(e) => onChange({ ...value, daysSinceMoveMax: e.target.value })}
            placeholder="Til (f.eks. 60)"
            aria-label="Dager siden flytting, til"
          />
        </div>
        <p className={styles.hint}>
          Fra flyttedatoen på personen, grensene er med. Negativt tall = før flytting. Tom = ingen grense.
          Personer uten flyttedato får ikke fordelen når en grense er satt.
        </p>
        {problem && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-sm)' }}>{problem}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Boligtype</label>
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          {Object.entries(HOUSING_TYPE_LABELS).map(([type, label]) => (
            <label key={type} style={checkboxLabel}>
              <input
                type="checkbox"
                checked={value.housingTypes.includes(type)}
                onChange={(e) => onChange({ ...value, housingTypes: toggle(value.housingTypes, type, e.target.checked) })}
              />
              {label}
            </label>
          ))}
        </div>
        <p className={styles.hint}>Tom = alle. Personer uten boligtype får ikke fordelen når en type er valgt.</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Kryssalg: vis bare etter at personen har valgt</label>
        {options.length === 0 ? (
          <p className={styles.hint}>Ingen andre fordeler å velge mellom.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', maxHeight: '12rem', overflowY: 'auto' }}>
            {options.map((b) => (
              <label key={b.id} style={checkboxLabel}>
                <input
                  type="checkbox"
                  checked={value.requiresChosenBenefitIds.includes(b.id)}
                  onChange={(e) =>
                    onChange({ ...value, requiresChosenBenefitIds: toggle(value.requiresChosenBenefitIds, b.id, e.target.checked) })
                  }
                />
                {b.title}
              </label>
            ))}
          </div>
        )}
        <p className={styles.hint}>Tom = ingen krav. Vises etter bestilling i web-løpet av minst én av de valgte.</p>
      </div>

      {showHideIfChosen && (
        <label style={{ ...checkboxLabel, marginBottom: 'var(--space-3)' }}>
          <input
            type="checkbox"
            checked={value.hideIfChosen}
            onChange={(e) => onChange({ ...value, hideIfChosen: e.target.checked })}
          />
          Skjul for personer som allerede har valgt denne fordelen
        </label>
      )}
    </>
  )
}
