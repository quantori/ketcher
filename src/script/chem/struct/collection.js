/****************************************************************************
 * Copyright 2018 EPAM Systems
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

function Collection(params) { // eslint-disable-line max-statements
	console.assert(params && 'name' in params && 'subname' in params && 'atoms' in params,
		'\'name\', \'subname\' and \'atoms\' properties must be specified!');

	this.name = params.name;
	this.subname = params.subname;
	this.atoms = params.atoms;

	if (this.subname.startsWith('STEABS')) {
		this.label = 'abs';
	} else if (this.subname.startsWith('STEREL')) {
		this.label = 'or' + this.subname.substr(6);
	} else if (this.subname.startsWith('STERAC')) {
		this.label = '&' + this.subname.substr(6);
	} else {
		console.warn('Unknown Collection subname: ', this.subname);
	}
}

export default Collection;
