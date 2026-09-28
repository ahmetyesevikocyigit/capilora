import { renderRoute,routeMetadata } from '@/lib/cms/route';
export async function generateMetadata({params}:{params:Promise<{lang:string;slug:string}>}){const {lang,slug}=await params;return routeMetadata(lang,[slug])}
export default async function Page({params}:{params:Promise<{lang:string;slug:string}>}){const {lang,slug}=await params;return renderRoute(lang,[slug])}
