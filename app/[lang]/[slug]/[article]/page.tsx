import { renderRoute,routeMetadata } from '@/lib/cms/route';
export async function generateMetadata({params}:{params:Promise<{lang:string;slug:string;article:string}>}){const {lang,slug,article}=await params;return routeMetadata(lang,[slug,article])}
export default async function Page({params}:{params:Promise<{lang:string;slug:string;article:string}>}){const {lang,slug,article}=await params;return renderRoute(lang,[slug,article])}
