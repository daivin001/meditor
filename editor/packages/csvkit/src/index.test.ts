/**
 * index.test.ts — csvkit 单一实现的预设行为锁定
 *
 * 锁定 mtable/jsonview 两个消费方依赖的行为差异点(补列/空输入/空白包裹),
 * 防止单一状态机回归时悄然改变任一包的对外行为。
 */
import { describe, expect, it } from 'vitest';
import { looksLikeCsv, numberToAbc, parseCsvMatrix, serializeCsvMatrix } from './index';

describe('parseCsvMatrix 基础解析(RFC 4180)', () => {
  it('解析引号包裹/双引号转义/字段内换行', () => {
    const text = 'a,"b,1","line1\nline2""x"""';
    expect(parseCsvMatrix(text)).toEqual([['a', 'b,1', 'line1\nline2"x"']]);
  });

  it('兼容 CRLF/CR/LF 换行', () => {
    expect(parseCsvMatrix('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsvMatrix('a,b\rc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsvMatrix('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('自定义分隔符(mtable 预设依赖)', () => {
    expect(parseCsvMatrix('a;b;c', { delimiter: ';' })).toEqual([['a', 'b', 'c']]);
  });
});

describe('行为差异点锁定', () => {
  it('默认(jsonview 预设):不补列,空输入返回空矩阵', () => {
    expect(parseCsvMatrix('a,b\nc')).toEqual([['a', 'b'], ['c']]);
    expect(parseCsvMatrix('')).toEqual([]);
  });

  it('mtable 预设:补列到矩形网格,空输入产出单空格表', () => {
    expect(parseCsvMatrix('a,b\nc', { padColumns: true })).toEqual([
      ['a', 'b'],
      ['c', ''],
    ]);
    expect(parseCsvMatrix('', { emptyAsBlankRow: true })).toEqual([['']]);
  });
});

describe('serializeCsvMatrix', () => {
  it('RFC 4180 必要集包裹(jsonview 预设):空白不包裹', () => {
    expect(serializeCsvMatrix([['x,1', 'he said "hi"', 'line\n2', ' padded']])).toBe(
      '"x,1","he said ""hi""","line\n2", padded',
    );
  });

  it('mtable 预设:空白字段也包裹 + 自定义分隔符', () => {
    expect(
      serializeCsvMatrix([[' padded', 'a;b']], { delimiter: ';', quoteWhitespace: true }),
    ).toBe('" padded";"a;b"');
  });

  it('行间 CRLF、末尾无换行', () => {
    expect(
      serializeCsvMatrix([
        ['a', 'b'],
        ['c', 'd'],
      ]),
    ).toBe('a,b\r\nc,d');
  });
});

describe('looksLikeCsv / numberToAbc', () => {
  it('looksLikeCsv 至少两行且含逗号', () => {
    expect(looksLikeCsv('a,b\nc,d')).toBe(true);
    expect(looksLikeCsv('single word')).toBe(false);
    expect(looksLikeCsv('a,b')).toBe(false);
  });

  it('numberToAbc 列号转字母', () => {
    expect(numberToAbc(0)).toBe('A');
    expect(numberToAbc(25)).toBe('Z');
    expect(numberToAbc(26)).toBe('AA');
    expect(numberToAbc(27)).toBe('AB');
  });
});

describe('parseCsvMatrix: BOM', () => {
  it('剥离 UTF-8 BOM,首列名不被污染', () => {
    // "name,age" 带前导 BOM(Excel 导出常见)。
    const text = '\uFEFFname,age\nAlice,30';
    expect(parseCsvMatrix(text)).toEqual([
      ['name', 'age'],
      ['Alice', '30'],
    ]);
  });

  it('无 BOM 输入行为不变', () => {
    expect(parseCsvMatrix('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('BOM 位于引号字段内时保留(仅剥文档首)', () => {
    expect(parseCsvMatrix('"\uFEFFa",b')).toEqual([['\uFEFFa', 'b']]);
  });
});
