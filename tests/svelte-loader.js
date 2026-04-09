export async function load(url, context, defaultLoad) {
  if (url.endsWith('.svelte')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export default {};',
    };
  }
  const result = await defaultLoad(url, context, defaultLoad);
  
  if (result.format === 'module' && result.source) {
    let source = result.source;
    if (typeof source !== 'string') {
        source = Buffer.from(source).toString('utf8');
    }
    if (source.includes('import.meta.env')) {
      return {
        ...result,
        source: source.replace(/import\.meta\.env/g, 'process.env')
      };
    }
  }
  return result;
}
