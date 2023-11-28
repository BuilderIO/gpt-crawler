import { mkdir } from "fs/promises";
import path from "path";

export function toArray<T>(value: T | T[]): T[] {
	return Array.isArray(value) ? value : [value];
}

export async function sequentialAsyncMap<T, R>(
	array: T[],
	asyncFunction: (value: T, index: number, array: T[]) => Promise<R>,
): Promise<R[]> {
	return array.reduce(
		async (previousPromise: Promise<R[]>, currentItem: T, index, array) => {
			const accumulator = await previousPromise;
			const result = await asyncFunction(currentItem, index, array);
			return [...accumulator, result];
		},
		Promise.resolve([] as R[]),
	);
}

export async function parallelAsyncMap<T, R>(
	array: T[],
	asyncFunction: (value: T, index: number, array: T[]) => Promise<R>,
): Promise<R[]> {
	return Promise.all(array.map(asyncFunction));
}

export async function ensureDirectoryExistence(filePath: string): Promise<void> {
	const dirName = path.dirname(filePath);
	await mkdir(dirName, { recursive: true });
}
