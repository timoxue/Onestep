console.log('=== 模块加载测试 ===\n');

try {
  const OldDockerManager = require('./docker-manager.js');
  console.log('❓ 加载旧模块: docker-manager.js');
  console.log('   getWorkspacePath 方法存在:', typeof OldDockerManager.prototype.getWorkspacePath !== 'undefined');
} catch (e) {
  console.log('✗ 无法加载旧模块:', e.message);
}

try {
  const NewDeployer = require('./openclaw-deployer.js');
  console.log('❓ 加载新模块: openclaw-deployer.js');
  console.log('   getWorkspacePath 方法存在:', typeof NewDeployer.prototype.getWorkspacePath !== 'undefined');

  // 测试方法
  if (typeof NewDeployer.prototype.getWorkspacePath !== 'undefined') {
    const deployer = new NewDeployer();
    const testPath = deployer.getWorkspacePath('test-tenant');
    console.log('   新模块生成的路径:', testPath);
  }
} catch (e) {
  console.log('✗ 无法加载新模块:', e.message);
}

console.log('\n=== 测试完成 ===');
