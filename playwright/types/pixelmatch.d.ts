declare module 'pixelmatch' {
    function pixelmatch(
        img1: Buffer,
        img2: Buffer,
        output: Buffer,
        width: number,
        height: number,
        options?: {
            threshold?: number;
            includeAA?: boolean;
            alpha?: boolean;
            aaColor?: number;
        }
    ): number;

    export = pixelmatch;
}
