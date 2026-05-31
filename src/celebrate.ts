import confetti from 'canvas-confetti';

export function celebrate() {
  // Two quick bursts from the lower corners
  const colors = ['#F0E040', '#FFD500', '#5BC0EB', '#FF6B6B', '#2ECC71'];
  confetti({
    particleCount: 80,
    spread: 60,
    startVelocity: 45,
    origin: { x: 0.2, y: 0.85 },
    colors,
  });
  confetti({
    particleCount: 80,
    spread: 60,
    startVelocity: 45,
    origin: { x: 0.8, y: 0.85 },
    colors,
  });
  // Trigger a subtle haptic on supporting devices (no-op on iOS Safari)
  if ('vibrate' in navigator) {
    try { navigator.vibrate?.([20, 40, 20]); } catch { /* ignore */ }
  }
}
