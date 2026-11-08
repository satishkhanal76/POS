import { PickerOptions, PickerPage } from "./types";

type Loader<T> = (options: PickerOptions) => Promise<PickerPage<T>>;
interface CachedPage<T> {
  load: Loader<T>;
  signature: string;
  options: PickerOptions;
  promise: Promise<PickerPage<T>>;
  result?: PickerPage<T>;
  expires: number;
}

/** One bounded page per mounted picker, including its in-flight preload. */
export default class FirstPageCache<T> {
  private entry?: CachedPage<T>;
  expire() {
    if (this.entry) this.entry.expires = 0;
  }
  get(
    load: Loader<T>,
    options: PickerOptions,
    revision: string,
  ): CachedPage<T> {
    const signature = JSON.stringify([
      options.limit,
      options.recentFirst,
      options.purchase,
      revision,
    ]);
    const previous =
      this.entry?.load === load && this.entry.signature === signature
        ? this.entry
        : undefined;
    if (previous && previous.expires > Date.now()) return previous;
    // Retain a usable page during age-based background refresh, but never across
    // settings, catalog revisions, or workspace/controller changes.
    const entry: CachedPage<T> = {
      load,
      signature,
      options,
      result: previous?.result,
      expires: Infinity,
      promise: Promise.resolve().then(() => load(options)),
    };
    entry.promise = entry.promise.then(
      (result) => {
        entry.result = result;
        entry.expires = Date.now() + 60000;
        return result;
      },
      (error) => {
        if (this.entry === entry) this.entry = undefined;
        throw error;
      },
    );
    this.entry = entry;
    return entry;
  }
}
