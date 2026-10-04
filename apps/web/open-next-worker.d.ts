declare module "@open-next/worker" {
  const handler: { fetch: ExportedHandlerFetchHandler<CloudflareEnv> };
  export default handler;
}
