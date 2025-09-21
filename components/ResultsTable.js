"use client";

export default function ResultsTable({ items }) {
  if (!items?.length) return null;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Start</th>
          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>End</th>
          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Mention</th>
          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Address</th>
          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Coordinates</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, idx) => (
          <tr key={idx}>
            <td>{formatTime(it.timeStartSec)}</td>
            <td>{formatTime(it.timeEndSec)}</td>
            <td>{it.mention}</td>
            <td>{it.locationName || ''}</td>
            <td>{it.coordinates ? `${it.coordinates.lat}, ${it.coordinates.lng}` : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatTime(sec) {
  if (typeof sec !== 'number' || Number.isNaN(sec)) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const parts = [h, m, s].map((n) => String(n).padStart(2, '0'));
  return parts.join(':');
}
