/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.entities;

import java.io.Serializable;
import javax.persistence.*;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;
import javax.xml.bind.annotation.XmlType;

/**
 * Entity that contains gene/strain information.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Entity
@Table(name = "data_context", catalog = "phenodcc_qc")
@XmlRootElement
@XmlType(propOrder = {"id", "cid", "gid", "sid", "geneSymbol", "geneId", "geneName", "alleleName", "strain", "genotype"})
@NamedQueries({
    @NamedQuery(name = "GeneStrain.all", query = "SELECT new org.mousephenotype.dcc.visualise.entities.GeneStrain(c.cid, c.gid, c.sid, g.geneSymbol, g.geneId, g.geneName, g.alleleName, s.strain, s.mgiStrainId, g.genotype, MAX(c.stateId.cid), SUM(c.numIssues - c.numResolved)) FROM DataContext c, ProcedureHasParameters phq, Parameter q, Genotype g, Strain s WHERE (c.pid = phq.procedureId.procedureId AND phq.parameterId.parameterId = q.parameterId AND c.qid = q.parameterId AND q.type != 'procedureMetadata' AND q.graphType IS NOT NULL AND c.gid = g.genotypeId AND g.genotypeId <> 0 AND c.sid = s.strainId AND c.numMeasurements > 0) GROUP BY c.cid, c.gid, c.sid ORDER BY s.strain, g.geneSymbol"),
    @NamedQuery(name = "GeneStrain.search", query = "SELECT new org.mousephenotype.dcc.visualise.entities.GeneStrain(c.cid, c.gid, c.sid, g.geneSymbol, g.geneId, g.geneName, g.alleleName, s.strain, s.mgiStrainId, g.genotype, MAX(c.stateId.cid), SUM(c.numIssues - c.numResolved)) FROM DataContext c, ProcedureHasParameters phq, Parameter q, Genotype g, Strain s WHERE (c.pid = phq.procedureId.procedureId AND phq.parameterId.parameterId = q.parameterId AND c.qid = q.parameterId AND q.type != 'procedureMetadata' AND q.graphType IS NOT NULL AND c.gid = g.genotypeId AND g.genotypeId <> 0 AND c.sid = s.strainId AND c.numMeasurements > 0 AND (g.geneSymbol LIKE :queryString OR g.alleleName LIKE :queryString OR s.strain LIKE :queryString)) GROUP BY c.cid, c.gid, c.sid ORDER BY s.strain, g.geneSymbol"),
    @NamedQuery(name = "GeneStrain.selected", query = "SELECT new org.mousephenotype.dcc.visualise.entities.GeneStrain(c.cid, c.gid, c.sid, g.geneSymbol, g.geneId, g.geneName, g.alleleName, s.strain, s.mgiStrainId, g.genotype, MAX(c.stateId.cid), SUM(c.numIssues - c.numResolved)) FROM DataContext c, ProcedureHasParameters phq, Parameter q, Genotype g, Strain s WHERE (c.pid = phq.procedureId.procedureId AND phq.parameterId.parameterId = q.parameterId AND c.qid = q.parameterId AND q.type != 'procedureMetadata' AND q.graphType IS NOT NULL AND c.gid IN :gids AND c.gid = g.genotypeId AND g.genotypeId <> 0 AND c.sid = s.strainId AND c.numMeasurements > 0) GROUP BY c.cid, c.gid, c.sid ORDER BY s.strain, g.geneSymbol")
})
public class GeneStrain implements Serializable {

    @EmbeddedId
    protected GeneStrainPK id;
    private Integer cid;
    private Integer gid;
    private Integer sid;
    private String geneSymbol;
    private String geneId;
    private String geneName;
    private String alleleName;
    private String strain;
    private String mgiStrainId;
    private String genotype;
    private Short stateId;
    private Long numUnresolved;

    public GeneStrain() {
    }

    public GeneStrain(Integer cid, Integer gid, Integer sid, String geneSymbol,
            String geneId, String geneName, String alleleName, String strain,
            String mgiStrainId, String genotype, Short stateId, Long numUnresolved) {
        this.id = new GeneStrainPK(cid, gid, sid);
        this.cid = cid;
        this.gid = gid;
        this.sid = sid;
        this.geneSymbol = geneSymbol;
        this.geneId = geneId;
        this.geneName = geneName;
        this.alleleName = alleleName;
        this.strain = strain;
        this.mgiStrainId = mgiStrainId;
        this.genotype = genotype;
        this.stateId = stateId;
        this.numUnresolved = numUnresolved;
    }

    @XmlTransient
    public GeneStrainPK getId() {
        return id;
    }

    public void setId(GeneStrainPK id) {
        this.id = id;
    }

    public Integer getCid() {
        return cid;
    }

    public void setCid(Integer cid) {
        this.cid = cid;
    }

    public Integer getGid() {
        return gid;
    }

    public void setGid(Integer gid) {
        this.gid = gid;
    }

    public Integer getSid() {
        return sid;
    }

    public void setSid(Integer sid) {
        this.sid = sid;
    }

    public String getGeneSymbol() {
        return geneSymbol;
    }

    public void setGeneSymbol(String geneSymbol) {
        this.geneSymbol = geneSymbol;
    }

    public String getGeneId() {
        return geneId;
    }

    public void setGeneId(String geneId) {
        this.geneId = geneId;
    }

    public String getGeneName() {
        return geneName;
    }

    public void setGeneName(String geneName) {
        this.geneName = geneName;
    }

    public String getAlleleName() {
        return alleleName;
    }

    public void setAlleleName(String alleleName) {
        this.alleleName = alleleName;
    }

    public String getStrain() {
        return strain;
    }

    public void setStrain(String strain) {
        this.strain = strain;
    }

    public String getMgiStrainId() {
        return mgiStrainId;
    }

    public void setMgiStrainId(String mgiStrainId) {
        this.mgiStrainId = mgiStrainId;
    }

    public String getGenotype() {
        return genotype;
    }

    public void setGenotype(String genotype) {
        this.genotype = genotype;
    }

    public Short getStateId() {
        return stateId;
    }

    public void setStateId(Short stateId) {
        this.stateId = stateId;
    }

    public Long getNumUnresolved() {
        return numUnresolved;
    }

    public void setNumUnresolved(Long numUnresolved) {
        this.numUnresolved = numUnresolved;
    }
    
}
