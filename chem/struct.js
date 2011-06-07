/****************************************************************************
 * Copyright (C) 2009-2010 GGA Software Services LLC
 * 
 * This file may be distributed and/or modified under the terms of the
 * GNU Affero General Public License version 3 as published by the Free
 * Software Foundation and appearing in the file LICENSE.GPL included in
 * the packaging of this file.
 * 
 * This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
 * WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 ***************************************************************************/

// chem.Struct constructor and utilities are defined here
if (!window.chem || !util.Vec2 || !chem.Pool)
	throw new Error("Vec2, Pool should be defined first")

chem.Struct = function ()
{
	this.atoms = new chem.Pool();
	this.bonds = new chem.Pool();
	this.sgroups = new chem.Pool();
	this.isChiral = false;
}

chem.Struct.prototype.toLists = function ()
{
	var aidMap = {};
	var atomList = [];
	this.atoms.each(function(aid, atom) {
		aidMap[aid] = atomList.length;
		atomList.push(atom);
	});

	var bondList = [];
	this.bonds.each(function(bid, bond) {
		var b = Object.clone(bond);
		b.begin = aidMap[bond.begin];
		b.end = aidMap[bond.end];
		bondList.push(b);
	});

	return {
		'atoms': atomList,
		'bonds': bondList
	};
}

chem.Struct.prototype.clone = function ()
{
	var cp = new chem.Struct();
	var aidMap = {};
	this.atoms.each(function(aid, atom) {
		aidMap[aid] = cp.atoms.add(atom.clone());
	});

	var bidMap = {};
	this.bonds.each(function(bid, bond) {
		bidMap[bid] = cp.bonds.add(bond.clone(aidMap));
	});

	this.sgroups.each(function(sid, sg) {
		sg = chem.SGroup.clone(sg, aidMap, bidMap);
		var id = cp.sgroups.add(sg);
		sg.id = id;
		for (var i = 0; i < sg.atoms.length; ++i) {
			chem.Set.add(cp.atoms.get(sg.atoms[i]).sgs, id);
		}
	});
	cp.isChiral = this.isChiral;

	return cp;
}

chem.Struct.prototype.findBondId = function (begin, end)
{
	var id = -1;
    
	this.bonds.find(function (bid, bond)
	{
		if ((bond.begin == begin && bond.end == end) ||
			(bond.begin == end && bond.end == begin))
			{
			id = bid;
			return true;
		}
		return false;
	}, this);
    
	return id;
}

chem.Struct.prototype.merge = function (mol)
{
	var aidMap = {};
	mol.atoms.each(function(aid, atom){
		aidMap[aid] = this.atoms.add(atom);
	}, this);
	mol.bonds.each(function(bid, bond){
		var params = new chem.Struct.Bond(bond);
		params.begin = aidMap[bond.begin];
		params.end = aidMap[bond.end];
		this.bonds.add(params);
	}, this);
}

chem.Struct.ATOM =
{
	RADICAL:
	{
		NONE:    0,
		SINGLET: 1,
		DOUPLET: 2,
		TRIPLET: 3
	}
};

chem.Struct.radicalElectrons = function(radical)
{
	radical = radical - 0;
	if (radical == chem.Struct.ATOM.RADICAL.NONE)
		return 0;
	else if (radical == chem.Struct.ATOM.RADICAL.DOUPLET)
		return 1;
	else if (radical == chem.Struct.ATOM.RADICAL.SINGLET ||
		radical == chem.Struct.ATOM.RADICAL.TRIPLET)
		return 2;
	throw new Error("Unknown radical value");
}

chem.Struct.BOND =
{
	TYPE:
	{
		SINGLE: 1,
		DOUBLE: 2,
		TRIPLE: 3,
		AROMATIC: 4,
		SINGLE_OR_DOUBLE: 5,
		SINGLE_OR_AROMATIC: 6,
		DOUBLE_OR_AROMATIC: 7,
		ANY : 8
	},

	STEREO:
	{
		NONE: 0,
		UP: 1,
		EITHER: 4,
		DOWN: 6,
		CIS_TRANS: 3
	},

	TOPOLOGY:
	{
		EITHER: 0,
		RING: 1,
		CHAIN: 2
	}
};

chem.Struct.FRAGMENT = {
	NONE:0,
	REACTANT:1,
	PRODUCT:2,
	AGENT:3
};

chem.Struct.prototype.merge = function (mol)
{
	var aidMap = {};
	mol.atoms.each(function(aid, atom){
		aidMap[aid] = this.atoms.add(atom);
	}, this);
	mol.bonds.each(function(bid, bond){
		var params = new chem.Struct.Bond(bond);
		params.begin = aidMap[bond.begin];
		params.end = aidMap[bond.end];
		this.bonds.add(params);
	}, this);
}

chem.Struct.Atom = function (params)
{
	if (!params || !('label' in params))
		throw new Error("label must be specified!");

	this.label = params.label;
	chem.ifDef(this, params, 'isotope', 0);
	chem.ifDef(this, params, 'radical', 0);
	chem.ifDef(this, params, 'charge', 0);
	chem.ifDef(this, params, 'valence', 0);
	chem.ifDef(this, params, 'explicitValence', 0);
	chem.ifDef(this, params, 'implicitH', 0);
	if (!Object.isUndefined(params.pos))
		this.pos = new util.Vec2(params.pos);
	else
		this.pos = new util.Vec2();

	this.sgs = {};

	// query
	chem.ifDef(this, params, 'ringBondCount', -1);
	chem.ifDef(this, params, 'substitutionCount', -1);
	chem.ifDef(this, params, 'unsaturatedAtom', -1);

	this.atomList = !Object.isUndefined(params.atomList) && params.atomList != null ? new chem.Struct.AtomList(params.atomList) : null;
}

chem.Struct.Atom.prototype.clone = function ()
{
	return new chem.Struct.Atom(this);
}

chem.Struct.Atom.prototype.isQuery =  function ()
{
	return this.atomList != null || this.label == 'A';
}

chem.Struct.Atom.prototype.pureHydrogen =  function ()
{
	return this.label == 'H' && this.isotope == 0;
}

chem.Struct.Atom.prototype.isPlainCarbon =  function ()
{
	return this.label == 'C' && this.isotope == 0 && this.isotope == 0 &&
		this.radical == 0 && this.charge == 0 && this.explicitValence == 0 &&
		this.ringBondCount == -1 && this.substitutionCount == -1 && this.unsaturatedAtom == -1 &&
		!this.atomList;
}

chem.Struct.AtomList = function (params)
{
	if (!params || !('notList' in params) || !('ids' in params))
		throw new Error("'notList' and 'ids' must be specified!");

	this.notList = params.notList; /*boolean*/
	this.ids = params.ids; /*Array of integers*/
}

chem.Struct.AtomList.prototype.labelList = function ()
{
	var labels = [];
	for (var i = 0; i < this.ids.length; ++i)
		labels.push(chem.Element.elements.get(this.ids[i]).label);
	return labels;
}

chem.Struct.AtomList.prototype.label = function ()
{
	var label = "[" + this.labelList().join(",") + "]";
	if (this.notList)
		label = "!" + label;
	return label;
}

chem.Struct.Bond = function (params)
{
	if (!params || !('begin' in params) || !('end' in params) || !('type' in params))
		throw new Error("'begin', 'end' and 'type' properties must be specified!");

	this.begin = params.begin;
	this.end = params.end;
	this.type = params.type;
	chem.ifDef(this, params, 'stereo', chem.Struct.BOND.STEREO.NONE);
	chem.ifDef(this, params, 'topology', chem.Struct.BOND.TOPOLOGY.EITHER);
	chem.ifDef(this, params, 'reactingCenterStatus', 0);
}

chem.Struct.Bond.prototype.clone = function (aidMap)
{
	var cp = new chem.Struct.Bond(this);
	if (aidMap) {
		cp.begin = aidMap[cp.begin];
		cp.end = aidMap[cp.end];
	}
	return cp;
}

chem.Struct.Bond.prototype.findOtherEnd = function (i)
{
	if (i == this.begin)
		return this.end;
	if (i == this.end)
		return this.begin;
	throw new Error("bond end not found");
}

chem.Struct.prototype.sGroupsRecalcCrossBonds = function () {
	this.sgroups.each(function(sgid, sg){
		sg.xBonds = [];
		sg.neiAtoms = [];
	},this);
	this.bonds.each(function(bid, bond){
		var a1 = this.atoms.get(bond.begin);
		var a2 = this.atoms.get(bond.end);
		chem.Set.each(a1.sgs, function(sgid){
			if (!chem.Set.contains(a2.sgs, sgid)) {
				var sg = this.sgroups.get(sgid);
				sg.xBonds.push(bid);
				chem.arrayAddIfMissing(sg.neiAtoms, bond.end);
			}
		}, this);
		chem.Set.each(a2.sgs, function(sgid){
			if (!chem.Set.contains(a1.sgs, sgid)) {
				var sg = this.sgroups.get(sgid);
				sg.xBonds.push(bid);
				chem.arrayAddIfMissing(sg.neiAtoms, bond.begin);
			}
		}, this);
	},this);
}

chem.Struct.prototype.getObjBBox = function ()
{
	var bb = null;
	this.atoms.each(function (aid, atom) {
		if (!bb)
			bb = {
				min: atom.pos,
				max: atom.pos
			}
		else {
			bb.min = util.Vec2.min(bb.min, atom.pos);
			bb.max = util.Vec2.max(bb.max, atom.pos);
		}
	});
	if (!bb)
		bb = {
			min: new util.Vec2(0, 0),
			max: new util.Vec2(1, 1)
		};
	return new chem.Box2Abs(bb.min, bb.max);
}

chem.Struct.prototype.sGroupDelete = function (sgid)
{
	var sg = this.sgroups.get(sgid);
	for (var i = 0; i < sg.atoms.length; ++i) {
		chem.Set.remove(this.atoms.get(sg.atoms[i]).sgs, sgid);
	}
	this.sgroups.remove(sgid);
}