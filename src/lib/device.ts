/**
 * 设备性能检测工具
 * 
 * 用于检测是否为低端设备，以决定是否启用动画降级
 */

/**
 * 检测设备是否为低端设备
 * 基于内存、CPU核心数、硬件并发等特征
 */
export function isLowEndDevice(): boolean {
  // 检测逻辑
  const memory = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  
  // 如果设备内存小于等于2GB，认为是低端设备
  if (memory && memory <= 2) {
    return true;
  }
  
  // 如果CPU核心数小于等于2，认为是低端设备
  if (cores && cores <= 2) {
    return true;
  }
  
  // 检测是否为移动端低端设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // 如果是旧版iPhone（SE或更早）
  if (isMobile && /iPhone.*(OS 12|OS 13|OS 14)/.test(navigator.userAgent)) {
    return true;
  }
  
  // 如果是旧版Android
  if (isMobile && /Android [456]/.test(navigator.userAgent)) {
    return true;
  }
  
  return false;
}

/**
 * 检测是否支持Canvas动画
 */
export function supportsCanvasAnimation(): boolean {
  const canvas = document.createElement('canvas');
  return !!(
    canvas.getContext('2d') &&
    window.requestAnimationFrame
  );
}

/**
 * 获取设备性能等级
 * @returns 'high' | 'medium' | 'low'
 */
export function getDevicePerformanceLevel(): 'high' | 'medium' | 'low' {
  const memory = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  
  // 高性能设备
  if ((memory && memory >= 8) || (cores && cores >= 6)) {
    return 'high';
  }
  
  // 低性能设备
  if (isLowEndDevice()) {
    return 'low';
  }
  
  // 默认中等
  return 'medium';
}

/**
 * 根据设备性能获取动画配置
 */
export function getAnimationConfig() {
  const level = getDevicePerformanceLevel();
  
  switch (level) {
    case 'high':
      return {
        enableParticles: true,
        enableTrail: true,
        enableGlow: true,
        duration: 900, // 正常时长
        particleCount: 50,
      };
    case 'medium':
      return {
        enableParticles: true,
        enableTrail: true,
        enableGlow: false,
        duration: 700, // 稍快
        particleCount: 30,
      };
    case 'low':
    default:
      return {
        enableParticles: false,
        enableTrail: false,
        enableGlow: false,
        duration: 500, // 最快
        particleCount: 0,
      };
  }
}
