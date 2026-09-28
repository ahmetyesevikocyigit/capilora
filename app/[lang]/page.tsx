import { renderRoute,routeMetadata } from '@/lib/cms/route';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}){return routeMetadata((await params).lang,[])}
export default async function Home({params}:{params:Promise<{lang:string}>}){return renderRoute((await params).lang,[])}
