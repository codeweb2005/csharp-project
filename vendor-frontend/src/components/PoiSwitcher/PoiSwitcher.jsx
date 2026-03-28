/**
 * PoiSwitcher — Dropdown selector shown in the TopBar when a Vendor manages multiple POIs.
 *
 * Renders:
 *   - A compact Select with each POI's icon + name
 *   - Only visible when vendorPOIIds.length > 1
 *   - Changing the selection updates PoiSwitcherContext → all pages re-fetch for that POI
 */

import { Select, Space, Typography, Tag } from 'antd'
import { Store } from 'lucide-react'
import { usePoiSwitcher } from '../../context/PoiSwitcherContext.jsx'

const { Text } = Typography

export default function PoiSwitcher() {
    const { activePOIId, setActivePOIId, poisMap, vendorPOIIds, hasMultiplePOIs, loadingPois } = usePoiSwitcher()

    // Only show if vendor has 2+ POIs
    if (!hasMultiplePOIs) return null

    const options = vendorPOIIds.map(id => {
        const poi = poisMap[id]
        return {
            value: id,
            label: (
                <Space size={6}>
                    <span style={{ fontSize: 16 }}>{poi?.categoryIcon ?? '🏪'}</span>
                    <Text style={{ fontSize: 13 }}>{poi?.name ?? `Shop #${id}`}</Text>
                    {!poi?.isActive && <Tag color="default" style={{ fontSize: 11, lineHeight: '16px', padding: '0 4px' }}>Tạm ngưng</Tag>}
                </Space>
            ),
            // Plain text for search/filter
            searchLabel: poi?.name ?? `Shop #${id}`,
        }
    })

    return (
        <Space size={6} align="center" style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '2px 10px 2px 8px',
        }}>
            <Store size={15} color="#d97706" />
            <Select
                loading={loadingPois}
                value={activePOIId}
                onChange={setActivePOIId}
                options={options}
                optionFilterProp="searchLabel"
                showSearch
                variant="borderless"
                style={{ minWidth: 180, maxWidth: 260 }}
                popupMatchSelectWidth={false}
                size="small"
                suffixIcon={null}
                placeholder="Chọn quán..."
                optionLabelProp="label"
            />
        </Space>
    )
}
