import ThemeToggle from "@/components/ThemeToggle";

export default function SiteHeader() {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            说人话，选笔记本
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            你不需要懂参数。说清楚你要拿它干什么，我把这句话翻译成可以验证的条件，
            <span className="font-medium text-slate-700">并且把翻译过程摊开给你看</span>
            ——哪条理解错了，你直接删掉。
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
