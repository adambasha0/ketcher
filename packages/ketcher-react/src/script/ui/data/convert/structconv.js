/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import {
  AtomList,
  Bond,
  Elements,
  StereoLabel,
  getAtomType,
} from 'ketcher-core';
import { capitalize } from 'lodash/fp';
import {
  sdataSchema,
  getSdataDefault,
  sdataCustomSchema,
} from '../schema/sdata-schema';
import { matchCharge } from '../utils';

const DefaultStereoGroupNumber = 1;

export function fromElement(selem) {
  if (selem.label === 'R#') {
    return {
      type: 'rlabel',
      values: fromRlabel(selem.rglabel),
      ...selem,
    };
  }

  if (selem.label === 'complexobject') {
    return {
      type: 'complexobject',
      values: fromSurfaceChemistryList(),
      ...selem,
    };
  }

  if (selem.label === 'L#') return fromAtomList(selem);

  if (Elements.get(selem.label)) return fromAtom(selem);

  if (!selem.label && 'attachmentPoints' in selem)
    return { ap: fromApoint(selem.attachmentPoints) };

  return selem; // probably generic
}

export function toElement(elem) {
  if (elem.type === 'rlabel') {
    console.log(toRlabel(elem.values), 'check');
    return {
      label: elem.values.length ? 'R#' : 'C',
      rglabel: elem.values.length === 0 ? null : toRlabel(elem.values),
    };
  }

  if (elem.type === 'complexobject') {
    const idx = elem.values[0].id;
    const matching_identifier = parseInt(Math.random() * 200);
    return {
      label: `complexobject_${idx}_${matching_identifier}`,
      complexobjectlabel: elem.values.length === 0 ? null : idx,
    };
  }

  if (elem.type === 'list' || elem.type === 'not-list') return toAtomList(elem);

  if (!elem.label && 'ap' in elem) {
    return { attachmentPoints: toApoint(elem.ap) };
  }
  if (elem.atomType === 'list') {
    elem.label = 'L#';
    elem.pseudo = null;
    elem.atomList = new AtomList({
      notList: elem.notList,
      ids: elem.atomList?.split(',').map((el) => Elements.get(el).number) || [],
    });
    delete elem.notList;
    delete elem.atomType;
    return toAtom(elem);
  }

  if (elem.atomType === 'pseudo') {
    elem.label = elem.pseudo;
    elem.atomList = null;
    delete elem.notList;
    delete elem.atomType;
    return toAtom(elem);
  }

  if (
    Elements.get(capitalize(elem.label)) ||
    (elem.customQuery && elem.customQuery !== '')
  ) {
    elem.label = capitalize(elem.label);
    elem.pseudo = null;
    elem.atomList = null;
    delete elem.notList;
    delete elem.atomType;
    return toAtom(elem);
  }

  if (
    elem.label === 'A' ||
    elem.label === '*' ||
    elem.label === 'Q' ||
    elem.label === 'X' ||
    elem.label === 'R'
  ) {
    elem.pseudo = elem.label;
    return toAtom(elem);
  }

  return elem;
}

export function fromAtom(satom) {
  const alias = satom.alias || '';
  const atomType = getAtomType(satom);
  return {
    alias,
    atomType,
    atomList:
      satom.atomList?.ids.map((i) => Elements.get(i).label).join(',') || '',
    notList: satom.atomList?.notList || false,
    pseudo: satom.pseudo,
    label: satom.label,
    charge: satom.charge === null ? '' : satom.charge.toString(),
    isotope: satom.isotope === null ? '' : satom.isotope.toString(),
    explicitValence: satom.explicitValence,
    radical: satom.radical,
    invRet: satom.invRet,
    exactChangeFlag: !!satom.exactChangeFlag,
    ringBondCount: satom.ringBondCount,
    substitutionCount: satom.substitutionCount,
    unsaturatedAtom: !!satom.unsaturatedAtom,
    hCount: satom.hCount,
    stereoParity: satom.stereoParity,
    implicitHCount: satom.implicitHCount,
    aromaticity: satom.queryProperties.aromaticity,
    ringMembership: satom.queryProperties.ringMembership,
    ringSize: satom.queryProperties.ringSize,
    connectivity: satom.queryProperties.connectivity,
    chirality: satom.queryProperties.chirality,
    customQuery:
      satom.queryProperties.customQuery === null
        ? ''
        : satom.queryProperties.customQuery.toString(),
  };
}

export function toAtom(atom) {
  // TODO merge this to Atom.attrlist?
  //      see ratomtool
  const {
    aromaticity = null,
    ringMembership = null,
    ringSize = null,
    connectivity = null,
    chirality = null,
    customQuery = '',
    ...restAtom
  } = atom;
  if (customQuery && customQuery !== '') {
    return Object.assign({}, restAtom, {
      label: 'A',
      atomList: null,
      pseudo: null,
      alias: null,
      charge: null,
      isotope: null,
      explicitValence: -1,
      radical: 0,
      ringBondCount: 0,
      hCount: 0,
      substitutionCount: 0,
      unsaturatedAtom: 0,
      implicitHCount: null,
      queryProperties: {
        aromaticity: null,
        implicitHCount: null,
        ringMembership: null,
        ringSize: null,
        connectivity: null,
        chirality: null,
        customQuery,
      },
      invRet: 0,
      exactChangeFlag: 0,
    });
  }
  const pch = matchCharge(restAtom.charge);
  const charge = pch ? parseInt(pch[1] + pch[3] + pch[2]) : restAtom.charge;

  const conv = Object.assign({}, restAtom, {
    isotope: restAtom.isotope ? Number(restAtom.isotope) : null,
    // empty charge value by default treated as zero,
    // no need to pass and display zero values(0, -0) explicitly
    charge: restAtom.charge && charge !== 0 ? Number(charge) : null,
    alias: restAtom.alias || null,
    exactChangeFlag: +(restAtom.exactChangeFlag ?? false),
    unsaturatedAtom: +(restAtom.unsaturatedAtom ?? false),
    queryProperties: {
      aromaticity,
      implicitHCount: restAtom.implicitHCount,
      ringMembership,
      ringSize,
      connectivity,
      chirality,
      customQuery: customQuery === '' ? null : customQuery,
    },
  });

  return conv;
}

function fromAtomList(satom) {
  return {
    type: satom.atomList.notList ? 'not-list' : 'list',
    values: satom.atomList.ids.map((i) => Elements.get(i).label),
  };
}

function toAtomList(atom) {
  return {
    pseudo: null,
    label: 'L#',
    atomList: new AtomList({
      notList: atom.type === 'not-list',
      ids: atom.values.map((el) => Elements.get(el).number),
    }),
  };
}

export function fromStereoLabel(stereoLabel) {
  if (stereoLabel === null) return { type: null };
  const type = stereoLabel.match(/\D+/g)[0];
  const number = +stereoLabel.replace(type, '');

  if (type === StereoLabel.Abs) {
    return {
      type: stereoLabel,
      orNumber: DefaultStereoGroupNumber,
      andNumber: DefaultStereoGroupNumber,
    };
  }

  if (type === StereoLabel.And) {
    return {
      type,
      orNumber: DefaultStereoGroupNumber,
      andNumber: number,
    };
  }

  if (type === StereoLabel.Or) {
    return {
      type,
      orNumber: number,
      andNumber: DefaultStereoGroupNumber,
    };
  }
}

export function toStereoLabel(stereoLabel) {
  switch (stereoLabel.type) {
    case StereoLabel.And:
      return `${StereoLabel.And}${stereoLabel.andNumber || 1}`;

    case StereoLabel.Or:
      return `${StereoLabel.Or}${stereoLabel.orNumber || 1}`;

    default:
      return stereoLabel.type;
  }
}

function fromApoint(sap) {
  return {
    primary: ((sap || 0) & 1) > 0,
    secondary: ((sap || 0) & 2) > 0,
  };
}

function toApoint(ap) {
  return (ap.primary && 1) + (ap.secondary && 2);
}

function fromRlabel(rg) {
  const res = [];
  let rgi;
  let val;
  for (rgi = 0; rgi < 32; rgi++) {
    if (rg & (1 << rgi)) {
      val = rgi + 1;
      res.push(val);
    }
  }
  return res;
}

function toRlabel(values) {
  let res = 0;
  values.forEach((val) => {
    const rgi = val - 1;
    res |= 1 << rgi;
  });
  return res;
}

const list = [
  {
    Filling: 'solid',
    Color: 'Variations of Blue',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzQ0NzJjNCIgc3Ryb2tlPSIjMzE1MzhmIiBzdHJva2Utd2lkdGg9IjMiIC8+Cjwvc3ZnPgo=',
    id: 1,
  },
  {
    Filling: 'hatched',
    Color: 'Variations of Blue',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibHVlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjUsNSIgLz4KPC9zdmc+Cg==',
    id: 2,
  },
  {
    Filling: 'solid, smaller size',
    Color: 'Variations of Red',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzMCIgZmlsbD0iI2VkN2QzMSIgc3Ryb2tlPSIjYWM1YjIzIiBzdHJva2Utd2lkdGg9IjMiIC8+PC9zdmc+',
    id: 3,
  },
  {
    Filling: 'selection of colors',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9InVybCgjZ3JhZGllbnQpIiAvPg0KICA8ZGVmcz4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOmJsdWU7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJlZDtzdG9wLW9wYWNpdHk6MSIgLz4NCiAgICA8L2xpbmVhckdyYWRpZW50Pg0KICA8L2RlZnM+DQo8L3N2Zz4=',
    id: 4,
  },
  {
    Filling: 'Solid',
    Color: 'Variations of Yellow',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZmZjMDAwIiBzdHJva2U9IiNiYThjMDAiIHN0cm9rZS13aWR0aD0iMyIgLz4NCjwvc3ZnPg0K',
    id: 5,
  },
  {
    Filling: 'solid, divided',
    Color: 'Variations of Yellow',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNiYThjMDAiIHN0cm9rZS13aWR0aD0iMyIgLz4NCjwvc3ZnPg0K',
    id: 6,
  },
  {
    Filling: 'hatched',
    Color: 'Variations of Yellow',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNiYThjMDAiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+DQo8L3N2Zz4=',
    id: 7,
  },
  {
    Filling: 'Draft',
    Color: 'selection of colors',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIzMCIgcng9IjEwIiByeT0iMTAiIGZpbGw9InVybCgjZ3JhZGllbnQpIiAvPg0KICA8ZGVmcz4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOmdyZWVuO3N0b3Atb3BhY2l0eToxIiAvPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjp5ZWxsb3c7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9saW5lYXJHcmFkaWVudD4NCiAgPC9kZWZzPg0KPC9zdmc+',
    id: 8,
  },
  {
    Filling: 'Solid',
    Color: 'Variations of Grey',
    icon: 'Cjxzdmcgd2lkdGg9IjEwMCIgaGVpZ2h0PSI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiByeD0iMTUiIGZpbGw9IiM3NTcwNzAiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIzIiAvPgo8L3N2Zz4=',
    id: 9,
  },
  {
    Filling: 'hatched',
    Color: 'Variations of Grey',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIGZpbGw9IiNmZmYiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIzIiAgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+Cjwvc3ZnPg==',
    id: 10,
  },
  {
    Filling: 'Solid',
    Color: 'Variations of white',
    icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjMiIC8+Cjwvc3ZnPg==',
    id: 11,
  },
];

function fromSurfaceChemistryList() {
  return list;
}

function toSurfaceChemistryList(index) {
  return list[index];
}

export function fromBond(sbond) {
  const type = sbond.type;
  const stereo = sbond.stereo;
  const isCustomQuery = sbond.customQuery !== null;
  return {
    type: isCustomQuery ? '' : fromBondType(type, stereo),
    topology: sbond.topology,
    center: sbond.reactingCenterStatus,
    customQuery: !isCustomQuery ? '' : sbond.customQuery.toString(),
  };
}

export function toBond(bond) {
  const isCustomQuery = bond.customQuery !== '';
  return {
    topology: bond.topology,
    reactingCenterStatus: bond.center,
    customQuery: !isCustomQuery ? null : bond.customQuery,
    ...toBondType(isCustomQuery ? 'any' : bond.type),
  };
}

const bondCaptionMap = {
  single: {
    type: Bond.PATTERN.TYPE.SINGLE,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
  up: {
    type: Bond.PATTERN.TYPE.SINGLE,
    stereo: Bond.PATTERN.STEREO.UP,
  },
  down: {
    type: Bond.PATTERN.TYPE.SINGLE,
    stereo: Bond.PATTERN.STEREO.DOWN,
  },
  updown: {
    type: Bond.PATTERN.TYPE.SINGLE,
    stereo: Bond.PATTERN.STEREO.EITHER,
  },
  double: {
    type: Bond.PATTERN.TYPE.DOUBLE,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
  crossed: {
    type: Bond.PATTERN.TYPE.DOUBLE,
    stereo: Bond.PATTERN.STEREO.CIS_TRANS,
  },
  triple: {
    type: Bond.PATTERN.TYPE.TRIPLE,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
  aromatic: {
    type: Bond.PATTERN.TYPE.AROMATIC,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
  singledouble: {
    type: Bond.PATTERN.TYPE.SINGLE_OR_DOUBLE,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
  singlearomatic: {
    type: Bond.PATTERN.TYPE.SINGLE_OR_AROMATIC,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
  doublearomatic: {
    type: Bond.PATTERN.TYPE.DOUBLE_OR_AROMATIC,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
  any: {
    type: Bond.PATTERN.TYPE.ANY,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
  hydrogen: {
    type: Bond.PATTERN.TYPE.HYDROGEN,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
  dative: {
    type: Bond.PATTERN.TYPE.DATIVE,
    stereo: Bond.PATTERN.STEREO.NONE,
  },
};

export function toBondType(caption) {
  return Object.assign({}, bondCaptionMap[caption]);
}

function fromBondType(type, stereo) {
  for (const caption in bondCaptionMap) {
    if (
      bondCaptionMap[caption].type === type &&
      bondCaptionMap[caption].stereo === stereo
    )
      return caption;
  }
  return '';
}

export function fromSgroup(ssgroup) {
  const type = ssgroup.type || 'DAT';
  const { context, fieldName, fieldValue, absolute, attached } = ssgroup.attrs;

  if (absolute === false && attached === false)
    ssgroup.attrs.radiobuttons = 'Relative';
  else ssgroup.attrs.radiobuttons = attached ? 'Attached' : 'Absolute';

  if (
    sdataSchema[context][fieldName] &&
    sdataSchema[context][fieldName].properties.fieldValue.items
  )
    ssgroup.attrs.fieldValue = fieldValue.split('\n');

  const sDataInitValue =
    type === 'DAT'
      ? {
          context: context || getSdataDefault(sdataCustomSchema, 'context'),
          fieldName:
            fieldName || getSdataDefault(sdataCustomSchema, 'fieldName'),
          fieldValue:
            fieldValue || getSdataDefault(sdataCustomSchema, 'fieldValue'),
        }
      : {};

  return Object.assign({ type }, ssgroup.attrs, sDataInitValue);
}

export function toSgroup(sgroup) {
  const { type, radiobuttons, ...props } = sgroup;
  const attrs = { ...props };

  const absolute = 'absolute';
  const attached = 'attached';

  switch (radiobuttons) {
    case 'Absolute':
      attrs[absolute] = true;
      attrs[attached] = false;
      break;
    case 'Attached':
      attrs[absolute] = false;
      attrs[attached] = true;
      break;
    case 'Relative':
      attrs[absolute] = false;
      attrs[attached] = false;
      break;
    default:
      break;
  }

  if (attrs.fieldName) attrs.fieldName = attrs.fieldName.trim();

  if (attrs.fieldValue) {
    attrs.fieldValue =
      typeof attrs.fieldValue === 'string'
        ? attrs.fieldValue.trim()
        : attrs.fieldValue;
  }

  return {
    type,
    attrs,
  };
}
