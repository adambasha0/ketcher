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

import { xor } from 'lodash/fp';

function oneOrMore(multipl, values, item) {
  if (multipl) return xor(values, [item]);
  return xor(values, values.concat([item]));
}

function SurfaceChemisItemButtonList({
  value,
  onChange,
  schema,
  disabledIds,
  multiple,
  classes,
}) {
  let className;
  const selected = classes.selected || 'selected';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      {value.map((item, i) => {
        const className = value.includes(item) ? selected : '';
        return (
          <div
            key={i}
            style={{
              width: '50%', // Two items per row
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '16px', // Space between rows
            }}
            onClick={() => onChange([item])}
          >
            <img
              src={'data:image/svg+xml;base64,' + item.icon}
              height={40}
              width={40}
            />
          </div>
        );
      })}
    </div>
  );
}

export default SurfaceChemisItemButtonList;
